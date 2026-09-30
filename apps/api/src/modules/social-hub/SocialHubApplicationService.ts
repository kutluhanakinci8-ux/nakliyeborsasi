import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AuthenticatedUserContext,
  ResourceNotFoundException,
  SocialConnectionStatusCode,
  SocialPlatformCode,
  SocialPostStatusCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { CompanySocialPostEntity } from "../../infrastructure/database/entities/CompanySocialPostEntity";
import { CompanySocialReplyTemplateEntity } from "../../infrastructure/database/entities/CompanySocialReplyTemplateEntity";
import { CompanySocialSettingsEntity } from "../../infrastructure/database/entities/CompanySocialSettingsEntity";
import {
  assertSocialHubAdmin,
  assertSocialHubRead,
  canSocialHubPublish,
  resolveSocialHubPermissions,
} from "./SocialCompanyAuthorization";
import { SocialProviderRegistry } from "./providers/SocialProviderRegistry";

const PLATFORM_LABELS: Record<SocialPlatformCode, string> = {
  [SocialPlatformCode.Instagram]: "Instagram",
  [SocialPlatformCode.FacebookMessenger]: "Facebook Messenger",
  [SocialPlatformCode.WhatsAppCloud]: "WhatsApp Business",
  [SocialPlatformCode.LinkedIn]: "LinkedIn",
};

@Injectable()
export class SocialHubApplicationService {
  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    @InjectRepository(CompanySocialPostEntity)
    private readonly postRepository: Repository<CompanySocialPostEntity>,
    @InjectRepository(CompanySocialReplyTemplateEntity)
    private readonly templateRepository: Repository<CompanySocialReplyTemplateEntity>,
    @InjectRepository(CompanySocialSettingsEntity)
    private readonly settingsRepository: Repository<CompanySocialSettingsEntity>,
    private readonly socialProviderRegistry: SocialProviderRegistry,
  ) {}

  public async getHubSnapshot(user: AuthenticatedUserContext) {
    assertSocialHubRead(user);
    const settings = await this.ensureSettings(user.companyId);
    const connections = await this.listConnectionRows(user.companyId);
    const posts = await this.postRepository.find({
      where: { companyId: user.companyId },
      order: { updatedAt: "DESC" },
      take: 20,
    });
    const templates = await this.templateRepository.find({
      where: { companyId: user.companyId },
      order: { sortOrder: "ASC", title: "ASC" },
    });
    const permissions = resolveSocialHubPermissions(user, settings);
    const providers = this.socialProviderRegistry.listPlatforms().map((code) => {
      const provider = this.socialProviderRegistry.resolve(code);
      return {
        platformCode: code,
        label: PLATFORM_LABELS[code],
        implementationStatus: provider.getImplementationStatus(),
      };
    });

    return {
      permissions,
      settings: this.mapSettings(settings),
      providers,
      connections: connections.map((row) => this.mapConnection(row)),
      recentPosts: posts.map((row) => this.mapPost(row)),
      templates: templates.map((row) => this.mapTemplate(row)),
      inboxSummary: {
        totalOpenThreads: 0,
        byPlatform: providers.map((p) => ({
          platformCode: p.platformCode,
          openCount: 0,
          implementationStatus: p.implementationStatus,
        })),
        messagingDeepLink: "/messaging?tab=sohbet",
        note:
          "Sosyal kanal mesajları Mesajlar ekranına bağlanacak; webhook ingest henüz kapalı.",
      },
    };
  }

  public async startConnect(
    user: AuthenticatedUserContext,
    platformCode: string,
  ) {
    assertSocialHubAdmin(user);
    const provider = this.socialProviderRegistry.resolve(platformCode);
    const oauth = await provider.startOAuthConnect(user.companyId);
    const row = await this.ensureConnectionRow(user.companyId, provider.platformCode);
    row.statusCode =
      oauth.implementationStatus === "pending"
        ? SocialConnectionStatusCode.PendingOAuth
        : SocialConnectionStatusCode.PendingOAuth;
    row.lastErrorMessage =
      oauth.implementationStatus === "pending" ? oauth.message : null;
    await this.connectionRepository.save(row);
    return { oauth, connection: this.mapConnection(row) };
  }

  public async disconnect(user: AuthenticatedUserContext, platformCode: string) {
    assertSocialHubAdmin(user);
    const provider = this.socialProviderRegistry.resolve(platformCode);
    await provider.disconnect(user.companyId);
    const row = await this.connectionRepository.findOne({
      where: { companyId: user.companyId, platformCode: provider.platformCode },
    });
    if (row) {
      row.statusCode = SocialConnectionStatusCode.Disconnected;
      row.externalAccountId = null;
      row.displayName = null;
      row.profileUrl = null;
      row.connectedAt = null;
      row.tokenExpiresAt = null;
      row.grantedScopes = null;
      row.lastErrorMessage = null;
      await this.connectionRepository.save(row);
    }
    return { connection: row ? this.mapConnection(row) : null };
  }

  public async createPost(
    user: AuthenticatedUserContext,
    body: {
      bodyText: string;
      platformCodes: string[];
      mediaUrls?: string[];
    },
  ) {
    assertSocialHubRead(user);
    const settings = await this.ensureSettings(user.companyId);
    if (!settings.publishingEnabled) {
      throw new ValidationException("Yayınlama bu firma için kapalı.");
    }
    const platforms = this.normalizePlatformList(body.platformCodes);
    const post = await this.postRepository.save(
      this.postRepository.create({
        companyId: user.companyId,
        platformCodes: platforms.join(","),
        statusCode: SocialPostStatusCode.Draft,
        bodyText: body.bodyText.trim(),
        mediaUrlsJson: body.mediaUrls?.length
          ? JSON.stringify(body.mediaUrls)
          : null,
        createdByUserId: user.userId,
      }),
    );
    return { post: this.mapPost(post) };
  }

  public async updatePost(
    user: AuthenticatedUserContext,
    postId: string,
    patch: {
      bodyText?: string;
      platformCodes?: string[];
      mediaUrls?: string[];
      scheduledAt?: string | null;
    },
  ) {
    assertSocialHubRead(user);
    const post = await this.findPostForCompany(user.companyId, postId);
    if (
      post.statusCode === SocialPostStatusCode.Published ||
      post.statusCode === SocialPostStatusCode.Publishing
    ) {
      throw new ValidationException("Yayınlanmış gönderi düzenlenemez.");
    }
    if (patch.bodyText !== undefined) {
      post.bodyText = patch.bodyText.trim();
    }
    if (patch.platformCodes !== undefined) {
      post.platformCodes = this.normalizePlatformList(patch.platformCodes).join(",");
    }
    if (patch.mediaUrls !== undefined) {
      post.mediaUrlsJson = patch.mediaUrls.length
        ? JSON.stringify(patch.mediaUrls)
        : null;
    }
    if (patch.scheduledAt !== undefined) {
      post.scheduledAt = patch.scheduledAt ? new Date(patch.scheduledAt) : null;
      post.statusCode = patch.scheduledAt
        ? SocialPostStatusCode.Scheduled
        : SocialPostStatusCode.Draft;
    }
    await this.postRepository.save(post);
    return { post: this.mapPost(post) };
  }

  public async publishPost(user: AuthenticatedUserContext, postId: string) {
    const settings = await this.ensureSettings(user.companyId);
    if (!canSocialHubPublish(user, settings)) {
      throw new ValidationException("Yayınlama yetkiniz yok.");
    }
    const post = await this.findPostForCompany(user.companyId, postId);
    const platforms = post.platformCodes.split(",").filter(Boolean);
    if (platforms.length === 0) {
      throw new ValidationException("En az bir kanal seçin.");
    }
    post.statusCode = SocialPostStatusCode.Publishing;
    await this.postRepository.save(post);

    const mediaUrls = post.mediaUrlsJson
      ? (JSON.parse(post.mediaUrlsJson) as string[])
      : [];
    const errors: string[] = [];
    let externalId: string | null = null;
    for (const platformCode of platforms) {
      const provider = this.socialProviderRegistry.resolve(platformCode);
      const result = await provider.publishPost(user.companyId, {
        companyId: user.companyId,
        bodyText: post.bodyText,
        mediaUrls,
      });
      if (result.implementationStatus === "pending") {
        errors.push(`${platformCode}: ${result.message}`);
      } else if (result.externalPostId) {
        externalId = result.externalPostId;
      }
    }

    if (errors.length > 0) {
      post.statusCode = SocialPostStatusCode.Failed;
      post.lastErrorMessage = errors.join(" | ");
      await this.postRepository.save(post);
      return { post: this.mapPost(post), providerMessage: errors.join(" ") };
    }

    post.statusCode = SocialPostStatusCode.Published;
    post.publishedAt = new Date();
    post.externalPostId = externalId;
    post.lastErrorMessage = null;
    await this.postRepository.save(post);
    return { post: this.mapPost(post) };
  }

  public async createTemplate(
    user: AuthenticatedUserContext,
    body: { title: string; bodyText: string; channelScopeCode?: string | null },
  ) {
    assertSocialHubAdmin(user);
    const template = await this.templateRepository.save(
      this.templateRepository.create({
        companyId: user.companyId,
        title: body.title.trim(),
        bodyText: body.bodyText.trim(),
        channelScopeCode: body.channelScopeCode?.trim() || null,
        sortOrder: 0,
      }),
    );
    return { template: this.mapTemplate(template) };
  }

  public async updateTemplate(
    user: AuthenticatedUserContext,
    templateId: string,
    patch: {
      title?: string;
      bodyText?: string;
      channelScopeCode?: string | null;
      sortOrder?: number;
    },
  ) {
    assertSocialHubAdmin(user);
    const template = await this.templateRepository.findOne({
      where: { id: templateId, companyId: user.companyId },
    });
    if (!template) {
      throw new ResourceNotFoundException("SocialReplyTemplate", templateId);
    }
    if (patch.title !== undefined) {
      template.title = patch.title.trim();
    }
    if (patch.bodyText !== undefined) {
      template.bodyText = patch.bodyText.trim();
    }
    if (patch.channelScopeCode !== undefined) {
      template.channelScopeCode = patch.channelScopeCode?.trim() || null;
    }
    if (patch.sortOrder !== undefined) {
      template.sortOrder = patch.sortOrder;
    }
    await this.templateRepository.save(template);
    return { template: this.mapTemplate(template) };
  }

  public async deleteTemplate(user: AuthenticatedUserContext, templateId: string) {
    assertSocialHubAdmin(user);
    await this.templateRepository.delete({
      id: templateId,
      companyId: user.companyId,
    });
    return { deleted: true };
  }

  public async updateSettings(
    user: AuthenticatedUserContext,
    patch: {
      inboxEnabled?: boolean;
      publishingEnabled?: boolean;
      dispatcherCanReply?: boolean;
      dispatcherCanPublish?: boolean;
      ownerApprovalRequired?: boolean;
      acceptKvkk?: boolean;
    },
  ) {
    assertSocialHubAdmin(user);
    const settings = await this.ensureSettings(user.companyId);
    if (patch.inboxEnabled !== undefined) {
      settings.inboxEnabled = patch.inboxEnabled;
    }
    if (patch.publishingEnabled !== undefined) {
      settings.publishingEnabled = patch.publishingEnabled;
    }
    if (patch.dispatcherCanReply !== undefined) {
      settings.dispatcherCanReply = patch.dispatcherCanReply;
    }
    if (patch.dispatcherCanPublish !== undefined) {
      settings.dispatcherCanPublish = patch.dispatcherCanPublish;
    }
    if (patch.ownerApprovalRequired !== undefined) {
      settings.ownerApprovalRequired = patch.ownerApprovalRequired;
    }
    if (patch.acceptKvkk) {
      settings.kvkkAcceptedAt = new Date();
    }
    await this.settingsRepository.save(settings);
    return { settings: this.mapSettings(settings) };
  }

  public async syncInbox(user: AuthenticatedUserContext, platformCode: string) {
    assertSocialHubRead(user);
    const settings = await this.ensureSettings(user.companyId);
    if (!settings.inboxEnabled) {
      throw new ValidationException("Gelen kutusu bu firma için kapalı.");
    }
    const provider = this.socialProviderRegistry.resolve(platformCode);
    const result = await provider.syncInbox(user.companyId);
    return { sync: result };
  }

  private async ensureSettings(companyId: string): Promise<CompanySocialSettingsEntity> {
    const existing = await this.settingsRepository.findOne({
      where: { companyId },
    });
    if (existing) {
      return existing;
    }
    return this.settingsRepository.save(
      this.settingsRepository.create({
        companyId,
        inboxEnabled: true,
        publishingEnabled: true,
        dispatcherCanReply: false,
        dispatcherCanPublish: false,
        ownerApprovalRequired: true,
        kvkkAcceptedAt: null,
      }),
    );
  }

  private async listConnectionRows(
    companyId: string,
  ): Promise<CompanySocialConnectionEntity[]> {
    const existing = await this.connectionRepository.find({
      where: { companyId },
    });
    const byPlatform = new Map(existing.map((row) => [row.platformCode, row]));
    const rows: CompanySocialConnectionEntity[] = [];
    for (const platform of this.socialProviderRegistry.listPlatforms()) {
      const row =
        byPlatform.get(platform) ??
        (await this.ensureConnectionRow(companyId, platform));
      rows.push(row);
    }
    return rows;
  }

  private async ensureConnectionRow(
    companyId: string,
    platformCode: SocialPlatformCode,
  ): Promise<CompanySocialConnectionEntity> {
    const found = await this.connectionRepository.findOne({
      where: { companyId, platformCode },
    });
    if (found) {
      return found;
    }
    return this.connectionRepository.save(
      this.connectionRepository.create({
        companyId,
        platformCode,
        statusCode: SocialConnectionStatusCode.Disconnected,
        externalAccountId: null,
        displayName: null,
        profileUrl: null,
        lastErrorMessage: null,
        grantedScopes: null,
        connectedAt: null,
        tokenExpiresAt: null,
      }),
    );
  }

  private async findPostForCompany(
    companyId: string,
    postId: string,
  ): Promise<CompanySocialPostEntity> {
    const post = await this.postRepository.findOne({
      where: { id: postId, companyId },
    });
    if (!post) {
      throw new ResourceNotFoundException("SocialPost", postId);
    }
    return post;
  }

  private normalizePlatformList(codes: string[]): SocialPlatformCode[] {
    const unique = new Set<SocialPlatformCode>();
    for (const raw of codes) {
      const provider = this.socialProviderRegistry.resolve(raw);
      unique.add(provider.platformCode);
    }
    return [...unique];
  }

  private mapSettings(row: CompanySocialSettingsEntity) {
    return {
      inboxEnabled: row.inboxEnabled,
      publishingEnabled: row.publishingEnabled,
      dispatcherCanReply: row.dispatcherCanReply,
      dispatcherCanPublish: row.dispatcherCanPublish,
      ownerApprovalRequired: row.ownerApprovalRequired,
      kvkkAcceptedAt: row.kvkkAcceptedAt?.toISOString() ?? null,
    };
  }

  private mapConnection(row: CompanySocialConnectionEntity) {
    return {
      id: row.id,
      platformCode: row.platformCode,
      label:
        PLATFORM_LABELS[row.platformCode as SocialPlatformCode] ??
        row.platformCode,
      statusCode: row.statusCode,
      externalAccountId: row.externalAccountId,
      displayName: row.displayName,
      profileUrl: row.profileUrl,
      lastErrorMessage: row.lastErrorMessage,
      connectedAt: row.connectedAt?.toISOString() ?? null,
      tokenExpiresAt: row.tokenExpiresAt?.toISOString() ?? null,
    };
  }

  private mapPost(row: CompanySocialPostEntity) {
    return {
      id: row.id,
      platformCodes: row.platformCodes.split(",").filter(Boolean),
      statusCode: row.statusCode,
      bodyText: row.bodyText,
      mediaUrls: row.mediaUrlsJson
        ? (JSON.parse(row.mediaUrlsJson) as string[])
        : [],
      scheduledAt: row.scheduledAt?.toISOString() ?? null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      externalPostId: row.externalPostId,
      lastErrorMessage: row.lastErrorMessage,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapTemplate(row: CompanySocialReplyTemplateEntity) {
    return {
      id: row.id,
      title: row.title,
      bodyText: row.bodyText,
      channelScopeCode: row.channelScopeCode,
      sortOrder: row.sortOrder,
    };
  }
}
