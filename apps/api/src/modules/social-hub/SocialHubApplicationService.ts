import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AuthenticatedUserContext,
  CompanyRoleCode,
  DEFAULT_LOCALE,
  ResourceNotFoundException,
  SocialConnectionStatusCode,
  SocialPlatformCode,
  SocialPostStatusCode,
  SubscriptionModuleCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { ModularSubscriptionEntitlementService } from "../subscription/ModularSubscriptionEntitlementService";
import { CompanySocialConnectionEntity } from "../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { CompanySocialPostEntity } from "../../infrastructure/database/entities/CompanySocialPostEntity";
import { CompanySocialReplyTemplateEntity } from "../../infrastructure/database/entities/CompanySocialReplyTemplateEntity";
import { CompanySocialSettingsEntity } from "../../infrastructure/database/entities/CompanySocialSettingsEntity";
import {
  assertSocialHubAdmin,
  assertSocialHubRead,
  canSocialHubApprovePosts,
  canSocialHubPublish,
  resolveSocialHubPermissions,
} from "./SocialCompanyAuthorization";
import { SocialProviderRegistry } from "./providers/SocialProviderRegistry";
import { CompanySocialThreadLinkEntity } from "../../infrastructure/database/entities/CompanySocialThreadLinkEntity";
import { SocialHubMessagingBridgeService } from "./SocialHubMessagingBridgeService";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import {
  SocialHubAuditActionCode,
  SocialHubAuditService,
} from "./SocialHubAuditService";

export const INVITABLE_SOCIAL_TEAM_ROLES: readonly CompanyRoleCode[] = [
  CompanyRoleCode.SocialAdmin,
  CompanyRoleCode.Dispatcher,
  CompanyRoleCode.Viewer,
];

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
    @InjectRepository(CompanySocialThreadLinkEntity)
    private readonly threadLinkRepository: Repository<CompanySocialThreadLinkEntity>,
    private readonly socialProviderRegistry: SocialProviderRegistry,
    private readonly socialHubMessagingBridgeService: SocialHubMessagingBridgeService,
    @InjectRepository(CompanyMembershipEntity)
    private readonly membershipRepository: Repository<CompanyMembershipEntity>,
    private readonly socialHubAuditService: SocialHubAuditService,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
  ) {}

  private async assertSocialHubSubscription(companyId: string): Promise<void> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      companyId,
      SubscriptionModuleCode.SocialHub,
      DEFAULT_LOCALE,
    );
  }

  private subscriptionMeta(companyId: string) {
    return {
      moduleCode: SubscriptionModuleCode.SocialHub,
      upgradeHintPath: "/hesap/abonelik",
    };
  }

  private assertInboxOperationsAllowed(
    settings: CompanySocialSettingsEntity,
  ): void {
    if (!settings.inboxEnabled) {
      throw new ValidationException("Sosyal gelen kutusu kapalı.");
    }
    if (!settings.kvkkAcceptedAt) {
      throw new ValidationException(
        "Sosyal gelen kutusu için KVKK / kanal kullanım onayı gerekli.",
      );
    }
  }

  public async getHubSnapshot(user: AuthenticatedUserContext) {
    assertSocialHubRead(user);
    await this.assertSocialHubSubscription(user.companyId);
    const settings = await this.ensureSettings(user.companyId);
    const connections = await this.listConnectionRows(user.companyId);
    const posts = await this.postRepository.find({
      where: { companyId: user.companyId },
      order: { updatedAt: "DESC" },
      take: 50,
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

    const openLinks = await this.threadLinkRepository.find({
      where: { companyId: user.companyId, isOpen: true },
    });

    return {
      subscription: this.subscriptionMeta(user.companyId),
      permissions,
      settings: this.mapSettings(settings),
      connections: connections.map((row) => this.mapConnection(row)),
      recentPosts: posts.map((row) => this.mapPost(row)),
      templates: templates.map((row) => this.mapTemplate(row)),
      inboxSummary: {
        totalOpenThreads: openLinks.length,
        byPlatform: providers.map((p) => ({
          platformCode: p.platformCode,
          openCount: openLinks.filter(
            (link) => link.platformCode === p.platformCode,
          ).length,
          implementationStatus: p.implementationStatus,
        })),
        messagingDeepLink: "/messaging?tab=sohbet&filter=social",
        note:
          openLinks.length > 0
            ? "Sosyal konuşmalar Mesajlar listesinde kanal rozetiyle görünür. Harici API bağlantısı sonraki fazda."
            : "Demo veya API ile konuşma oluşturulunca Mesajlar ekranında listelenir.",
      },
    };
  }

  public async getAnalytics(user: AuthenticatedUserContext) {
    assertSocialHubRead(user);
    await this.assertSocialHubSubscription(user.companyId);
    const companyId = user.companyId;
    const posts = await this.postRepository.find({ where: { companyId } });
    const postsByStatus: Record<string, number> = {};
    for (const post of posts) {
      postsByStatus[post.statusCode] = (postsByStatus[post.statusCode] ?? 0) + 1;
    }
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const publishedLast30Days = posts.filter(
      (p) =>
        p.statusCode === SocialPostStatusCode.Published &&
        p.publishedAt &&
        p.publishedAt >= thirtyDaysAgo,
    ).length;
    const openLinks = await this.threadLinkRepository.count({
      where: { companyId, isOpen: true },
    });
    const connections = await this.connectionRepository.find({
      where: { companyId },
    });
    const connectedChannels = connections.filter(
      (c) => c.statusCode === SocialConnectionStatusCode.Connected,
    ).length;
    const templates = await this.templateRepository.count({
      where: { companyId },
    });
    const scheduledUpcoming = posts.filter(
      (p) =>
        p.statusCode === SocialPostStatusCode.Scheduled &&
        p.scheduledAt &&
        p.scheduledAt.getTime() > Date.now(),
    ).length;
    const pendingApproval = postsByStatus[SocialPostStatusCode.PendingApproval] ?? 0;

    return {
      analytics: {
        generatedAt: new Date().toISOString(),
        postsByStatus,
        publishedLast30Days,
        scheduledUpcoming,
        pendingApproval,
        openInboxThreads: openLinks,
        connectedChannels,
        templateCount: templates,
        providerReadiness: this.socialProviderRegistry
          .listPlatforms()
          .map((code) => ({
            platformCode: code,
            implementationStatus:
              this.socialProviderRegistry.resolve(code).getImplementationStatus(),
          })),
      },
    };
  }

  public async seedDemoInbox(user: AuthenticatedUserContext): Promise<{
    createdThreadIds: string[];
  }> {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
    const settings = await this.ensureSettings(user.companyId);
    this.assertInboxOperationsAllowed(settings);

    const samples = [
      {
        platform: SocialPlatformCode.Instagram,
        externalId: "demo-ig-001",
        label: "@musteri_demo",
        message: "Merhaba, İstanbul–Denizli için fiyat alabilir miyim?",
      },
      {
        platform: SocialPlatformCode.WhatsAppCloud,
        externalId: "demo-wa-001",
        label: "+90 555 000 00 00",
        message: "Kamyonum yarın boş, yük var mı?",
      },
    ];
    const createdThreadIds: string[] = [];
    for (const sample of samples) {
      const link = await this.socialHubMessagingBridgeService.ensureExternalThread({
        companyId: user.companyId,
        platformCode: sample.platform,
        externalThreadId: sample.externalId,
        displayLabel: sample.label,
      });
      await this.socialHubMessagingBridgeService.ingestInboundMessage(
        user.companyId,
        link.id,
        sample.message,
      );
      createdThreadIds.push(link.messageThreadId);
    }
    return { createdThreadIds };
  }

  public async startConnect(
    user: AuthenticatedUserContext,
    platformCode: string,
  ) {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
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
    await this.assertSocialHubSubscription(user.companyId);
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
    await this.assertSocialHubSubscription(user.companyId);
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
    await this.assertSocialHubSubscription(user.companyId);
    const settings = await this.ensureSettings(user.companyId);
    const post = await this.findPostForCompany(user.companyId, postId);
    if (!this.isPostEditable(post.statusCode)) {
      throw new ValidationException("Bu gönderi düzenlenemez.");
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
      post.approvedAt = null;
      post.approvedByUserId = null;
      if (!patch.scheduledAt) {
        post.statusCode = SocialPostStatusCode.Draft;
      } else if (
        settings.ownerApprovalRequired &&
        !canSocialHubApprovePosts(user)
      ) {
        post.statusCode = SocialPostStatusCode.PendingApproval;
      } else if (post.scheduledAt) {
        post.statusCode = this.resolveStatusAfterSchedule(post.scheduledAt);
      }
    }
    await this.postRepository.save(post);
    return { post: this.mapPost(post) };
  }

  public async deletePost(user: AuthenticatedUserContext, postId: string) {
    assertSocialHubRead(user);
    await this.assertSocialHubSubscription(user.companyId);
    const post = await this.findPostForCompany(user.companyId, postId);
    if (!this.isPostEditable(post.statusCode)) {
      throw new ValidationException("Bu gönderi silinemez.");
    }
    await this.postRepository.delete({ id: postId, companyId: user.companyId });
    return { deleted: true };
  }

  public async submitPostForApproval(
    user: AuthenticatedUserContext,
    postId: string,
  ) {
    assertSocialHubRead(user);
    await this.assertSocialHubSubscription(user.companyId);
    const settings = await this.ensureSettings(user.companyId);
    if (!settings.ownerApprovalRequired) {
      throw new ValidationException("Onay akışı kapalı.");
    }
    const post = await this.findPostForCompany(user.companyId, postId);
    if (
      post.statusCode !== SocialPostStatusCode.Draft &&
      post.statusCode !== SocialPostStatusCode.Failed
    ) {
      throw new ValidationException("Bu gönderi onaya gönderilemez.");
    }
    post.statusCode = SocialPostStatusCode.PendingApproval;
    await this.postRepository.save(post);
    this.socialHubAuditService.record(
      user,
      SocialHubAuditActionCode.PostSubmitApproval,
      `/company/social-hub/posts/${postId}/submit-approval`,
      { postId },
    );
    return { post: this.mapPost(post) };
  }

  public async approvePost(user: AuthenticatedUserContext, postId: string) {
    await this.assertSocialHubSubscription(user.companyId);
    if (!canSocialHubApprovePosts(user)) {
      throw new ValidationException("Onay yetkiniz yok.");
    }
    const post = await this.findPostForCompany(user.companyId, postId);
    if (post.statusCode !== SocialPostStatusCode.PendingApproval) {
      throw new ValidationException("Gönderi onay beklemiyor.");
    }
    post.approvedAt = new Date();
    post.approvedByUserId = user.userId;
    post.statusCode = post.scheduledAt
      ? this.resolveStatusAfterSchedule(post.scheduledAt)
      : SocialPostStatusCode.Approved;
    await this.postRepository.save(post);
    this.socialHubAuditService.record(
      user,
      SocialHubAuditActionCode.PostApprove,
      `/company/social-hub/posts/${postId}/approve`,
      { postId },
    );
    return { post: this.mapPost(post) };
  }

  public async cancelPost(user: AuthenticatedUserContext, postId: string) {
    assertSocialHubRead(user);
    await this.assertSocialHubSubscription(user.companyId);
    const post = await this.findPostForCompany(user.companyId, postId);
    const cancellable = [
      SocialPostStatusCode.Draft,
      SocialPostStatusCode.PendingApproval,
      SocialPostStatusCode.Approved,
      SocialPostStatusCode.Scheduled,
      SocialPostStatusCode.Failed,
    ];
    if (!cancellable.includes(post.statusCode as SocialPostStatusCode)) {
      throw new ValidationException("Bu gönderi iptal edilemez.");
    }
    post.statusCode = SocialPostStatusCode.Cancelled;
    post.scheduledAt = null;
    await this.postRepository.save(post);
    return { post: this.mapPost(post) };
  }

  public async publishPost(user: AuthenticatedUserContext, postId: string) {
    await this.assertSocialHubSubscription(user.companyId);
    const settings = await this.ensureSettings(user.companyId);
    if (!canSocialHubPublish(user, settings)) {
      throw new ValidationException("Yayınlama yetkiniz yok.");
    }
    const post = await this.findPostForCompany(user.companyId, postId);
    this.assertPostReadyToPublish(post, settings, user);
    this.socialHubAuditService.record(
      user,
      SocialHubAuditActionCode.PostPublish,
      `/company/social-hub/posts/${postId}/publish`,
      { postId },
    );
    return this.executePostPublish(post);
  }

  /** Zamanlanmış gönderiler için arka plan işi (kullanıcı bağlamı yok). */
  public async publishPostScheduled(post: CompanySocialPostEntity) {
    if (post.statusCode !== SocialPostStatusCode.Scheduled) {
      return { post: this.mapPost(post) };
    }
    if (post.scheduledAt && post.scheduledAt.getTime() > Date.now()) {
      return { post: this.mapPost(post) };
    }
    return this.executePostPublish(post);
  }

  private assertPostReadyToPublish(
    post: CompanySocialPostEntity,
    settings: CompanySocialSettingsEntity,
    user: AuthenticatedUserContext,
  ): void {
    const allowed = [
      SocialPostStatusCode.Draft,
      SocialPostStatusCode.Approved,
      SocialPostStatusCode.Scheduled,
      SocialPostStatusCode.Failed,
    ];
    if (!allowed.includes(post.statusCode as SocialPostStatusCode)) {
      throw new ValidationException("Bu gönderi yayınlanamaz.");
    }
    if (
      settings.ownerApprovalRequired &&
      !canSocialHubApprovePosts(user) &&
      post.statusCode !== SocialPostStatusCode.Approved
    ) {
      throw new ValidationException(
        "Yayın için firma sahibi / sosyal yönetici onayı gerekli.",
      );
    }
    if (
      post.statusCode === SocialPostStatusCode.Scheduled &&
      post.scheduledAt &&
      post.scheduledAt.getTime() > Date.now()
    ) {
      throw new ValidationException("Zamanlanmış yayın henüz gelmedi.");
    }
  }

  private async executePostPublish(post: CompanySocialPostEntity) {
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
      const result = await provider.publishPost(post.companyId, {
        companyId: post.companyId,
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
    post.scheduledAt = null;
    await this.postRepository.save(post);
    return { post: this.mapPost(post) };
  }

  private isPostEditable(statusCode: string): boolean {
    return [
      SocialPostStatusCode.Draft,
      SocialPostStatusCode.PendingApproval,
      SocialPostStatusCode.Approved,
      SocialPostStatusCode.Scheduled,
      SocialPostStatusCode.Failed,
    ].includes(statusCode as SocialPostStatusCode);
  }

  private resolveStatusAfterSchedule(scheduledAt: Date): SocialPostStatusCode {
    return scheduledAt.getTime() > Date.now()
      ? SocialPostStatusCode.Scheduled
      : SocialPostStatusCode.Approved;
  }

  public async createTemplate(
    user: AuthenticatedUserContext,
    body: { title: string; bodyText: string; channelScopeCode?: string | null },
  ) {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
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
    await this.assertSocialHubSubscription(user.companyId);
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
    await this.assertSocialHubSubscription(user.companyId);
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
    await this.assertSocialHubSubscription(user.companyId);
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
    this.socialHubAuditService.record(
      user,
      SocialHubAuditActionCode.SettingsUpdate,
      "/company/social-hub/settings",
      { patch },
    );
    return { settings: this.mapSettings(settings) };
  }

  public async listTeam(user: AuthenticatedUserContext) {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
    const memberships = await this.membershipRepository.find({
      where: { companyId: user.companyId },
      relations: { user: true },
      order: { createdAt: "ASC" },
    });
    return {
      members: memberships.map((row) => ({
        membershipId: row.id,
        userId: row.userId,
        emailAddress: row.user.emailAddress,
        displayName: row.user.displayName,
        roleCode: row.roleCode,
        isSelf: row.userId === user.userId,
      })),
      assignableRoleCodes: INVITABLE_SOCIAL_TEAM_ROLES,
      integrationsPath: "/hesap/uygulamalar",
    };
  }

  public async updateMemberRole(
    user: AuthenticatedUserContext,
    targetUserId: string,
    roleCode: string,
  ) {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
    const normalized = roleCode as CompanyRoleCode;
    if (!INVITABLE_SOCIAL_TEAM_ROLES.includes(normalized)) {
      throw new ValidationException("Bu rol atanamaz.");
    }
    const membership = await this.membershipRepository.findOne({
      where: { companyId: user.companyId, userId: targetUserId },
      relations: { user: true },
    });
    if (!membership) {
      throw new ResourceNotFoundException("CompanyMembership", targetUserId);
    }
    if (membership.roleCode === CompanyRoleCode.CompanyOwner) {
      throw new ValidationException("Firma sahibi rolü değiştirilemez.");
    }
    if (membership.userId === user.userId) {
      throw new ValidationException("Kendi rolünüzü buradan değiştiremezsiniz.");
    }
    const previousRole = membership.roleCode;
    membership.roleCode = normalized;
    await this.membershipRepository.save(membership);
    this.socialHubAuditService.record(
      user,
      SocialHubAuditActionCode.MemberRoleUpdate,
      `/company/social-hub/team/${targetUserId}/role`,
      {
        targetUserId,
        previousRoleCode: previousRole,
        roleCode: normalized,
      },
    );
    return {
      member: {
        userId: membership.userId,
        emailAddress: membership.user.emailAddress,
        displayName: membership.user.displayName,
        roleCode: membership.roleCode,
      },
    };
  }

  public async listAuditLog(user: AuthenticatedUserContext) {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
    const entries = await this.socialHubAuditService.listRecent(user.companyId);
    return { entries };
  }

  public async syncInbox(user: AuthenticatedUserContext, platformCode: string) {
    assertSocialHubRead(user);
    await this.assertSocialHubSubscription(user.companyId);
    const settings = await this.ensureSettings(user.companyId);
    this.assertInboxOperationsAllowed(settings);
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
      approvedAt: row.approvedAt?.toISOString() ?? null,
      approvedByUserId: row.approvedByUserId,
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
