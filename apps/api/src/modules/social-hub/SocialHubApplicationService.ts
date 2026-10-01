import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
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
import { getSocialHubProviderCapabilities } from "./socialHubProviderCapabilities";
import { parseSocialHubConnectionMetadata } from "./oauth/SocialHubConnectionMetadata";
import { SocialHubConnectionHealthService } from "./SocialHubConnectionHealthService";
import { SocialHubTokenRefreshService } from "./oauth/SocialHubTokenRefreshService";
import { SocialHubOutboundDeliveryLogService } from "./SocialHubOutboundDeliveryLogService";
import { SocialHubSlackNotificationService } from "./SocialHubSlackNotificationService";
import { SocialHubSlackDigestService } from "./SocialHubSlackDigestService";
import { SocialHubSlackInsightsService } from "./SocialHubSlackInsightsService";
import {
  normalizeSocialHubDigestTimezone,
} from "./socialHubDigestBusinessHours";
import { manualNotifyCooldownMessage } from "./socialHubManualNotifyCooldown";
import {
  assertRoadmapPlatformCode,
  isRoadmapPlatformCode,
  parseRoadmapInterestPlatformCodes,
  serializeRoadmapInterestPlatformCodes,
} from "./socialHubRoadmapInterest";
import { SOCIAL_HUB_ROADMAP_PROVIDERS } from "./socialHubRoadmapProviders";
import { isRoadmapOAuthEnvConfigured } from "./socialHubRoadmapOAuthReadiness";
import { SocialHubRoadmapOAuthApplicationService } from "./oauth/SocialHubRoadmapOAuthApplicationService";
import { SocialHubRoadmapTokenRefreshService } from "./oauth/SocialHubRoadmapTokenRefreshService";
import { hasRoadmapRefreshToken } from "./oauth/socialHubRoadmapRefreshToken";
import { labelSocialPlatform } from "./socialHubPlatformLabels";
import { SocialHubWeeklyEmailService } from "./SocialHubWeeklyEmailService";
import { normalizeSocialHubSlackWebhookUrl } from "./socialHubSlackWebhook";
import { buildSocialHubPublicWebhookUrls } from "./socialHubIntegrationUrls";
import { buildSocialHubIntegrationWebhookReadiness } from "./socialHubIntegrationWebhookReadiness";
import { buildSocialHubIntegrationOpsHints } from "./socialHubIntegrationOpsHints";
import { getRoadmapProviderCapabilities } from "./socialHubRoadmapCapabilities";
import { roadmapConnectedHint } from "./socialHubRoadmapHints";
import { SocialHubRoadmapInboxSyncService } from "./SocialHubRoadmapInboxSyncService";
import { mapWebhookBridgedByPlatform } from "./socialHubWebhookBridgeSnapshot";

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
    private readonly connectionHealthService: SocialHubConnectionHealthService,
    private readonly tokenRefreshService: SocialHubTokenRefreshService,
    private readonly outboundDeliveryLogService: SocialHubOutboundDeliveryLogService,
    private readonly slackNotificationService: SocialHubSlackNotificationService,
    private readonly slackDigestService: SocialHubSlackDigestService,
    private readonly slackInsightsService: SocialHubSlackInsightsService,
    private readonly weeklyEmailService: SocialHubWeeklyEmailService,
    private readonly roadmapOAuthApplicationService: SocialHubRoadmapOAuthApplicationService,
    private readonly roadmapTokenRefreshService: SocialHubRoadmapTokenRefreshService,
    private readonly roadmapInboxSyncService: SocialHubRoadmapInboxSyncService,
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
    const connectionRows = await this.connectionRepository.find({
      where: { companyId: user.companyId },
    });
    const connections = await this.listConnectionRows(
      user.companyId,
      connectionRows,
    );
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
        capabilities: getSocialHubProviderCapabilities(code),
      };
    });

    const openLinks = await this.threadLinkRepository.find({
      where: { companyId: user.companyId, isOpen: true },
    });

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [inboundBridged24h, lastInboundBridgedAt, bridgedByPlatform] =
      await Promise.all([
        this.socialHubAuditService.countRecentByActionForCompany(
          user.companyId,
          SocialHubAuditActionCode.WebhookInboundBridged,
          since24h,
        ),
        this.socialHubAuditService.latestCompanyActionAt(
          user.companyId,
          SocialHubAuditActionCode.WebhookInboundBridged,
        ),
        this.socialHubAuditService.summarizeWebhookBridgedByPlatform(
          since24h,
          user.companyId,
        ),
      ]);

    return {
      subscription: this.subscriptionMeta(user.companyId),
      permissions,
      settings: this.mapSettings(settings),
      providers,
      roadmapProviders: this.mapRoadmapProviders(settings, connectionRows),
      connections: connections.map((row) =>
        this.mapConnection(row, providers),
      ),
      recentPosts: posts.map((row) => this.mapPost(row)),
      templates: templates.map((row) => this.mapTemplate(row)),
      integrationWebhooks: buildSocialHubPublicWebhookUrls(),
      integrationWebhookReadiness: buildSocialHubIntegrationWebhookReadiness(),
      integrationOpsHints: buildSocialHubIntegrationOpsHints(),
      webhookActivity: {
        inboundBridged24h,
        lastInboundBridgedAt: lastInboundBridgedAt?.toISOString() ?? null,
        byPlatform: mapWebhookBridgedByPlatform(bridgedByPlatform),
      },
      inboxSummary: {
        totalOpenThreads: openLinks.length,
        byPlatform: [
          ...providers.map((p) => ({
            platformCode: p.platformCode,
            openCount: openLinks.filter(
              (link) => link.platformCode === p.platformCode,
            ).length,
            implementationStatus: p.implementationStatus,
          })),
          ...SOCIAL_HUB_ROADMAP_PROVIDERS.map((p) => ({
            platformCode: p.platformCode,
            openCount: openLinks.filter(
              (link) => link.platformCode === p.platformCode,
            ).length,
            implementationStatus: p.implementationStatus,
          })),
        ],
        messagingDeepLink: "/messaging?tab=sohbet&filter=social",
        note:
          openLinks.length > 0
            ? "Sosyal konuşmalar Mesajlar’da kanal rozetiyle listelenir; yanıtlar bağlı hesap üzerinden gider. Gönderim hatası konuşma başlığında görünür."
            : "Kanal bağlayın veya demo oluşturun; konuşmalar Mesajlar ekranında listelenir.",
      },
    };
  }

  public async getConnectionHealth(user: AuthenticatedUserContext) {
    assertSocialHubRead(user);
    await this.assertSocialHubSubscription(user.companyId);
    const health = await this.connectionHealthService.buildHealthDashboard(
      user.companyId,
    );
    const notificationInsights = await this.slackInsightsService.buildInsights(
      user.companyId,
    );
    const roadmapBetaChannelHealth = (health.roadmapChannels ?? []).map(
      (channel) => ({
        platformCode: channel.platformCode,
        label: channel.label,
        statusCode: channel.statusCode,
        openThreadCount: channel.openThreadCount,
        recentOutboundFailures24h: channel.recentOutboundFailures24h,
        tokenHealth: channel.tokenHealth,
      }),
    );
    return {
      health,
      notificationInsights: {
        ...notificationInsights,
        roadmapBetaChannelHealth,
      },
    };
  }

  public async exportNotificationInsightsCsv(
    user: AuthenticatedUserContext,
  ): Promise<string> {
    assertSocialHubRead(user);
    await this.assertSocialHubSubscription(user.companyId);
    const insights = await this.slackInsightsService.buildInsights(
      user.companyId,
    );
    const health = await this.connectionHealthService.buildHealthDashboard(
      user.companyId,
    );
    const roadmapBetaChannelHealth = (health.roadmapChannels ?? []).map(
      (channel) => ({
        platformCode: channel.platformCode,
        label: channel.label,
        statusCode: channel.statusCode,
        openThreadCount: channel.openThreadCount,
        recentOutboundFailures24h: channel.recentOutboundFailures24h,
        tokenHealth: channel.tokenHealth,
      }),
    );
    return this.slackInsightsService.buildInsightsCsv({
      ...insights,
      roadmapBetaChannelHealth,
    });
  }

  public async refreshConnectionToken(
    user: AuthenticatedUserContext,
    platformCode: string,
  ) {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
    const provider = this.socialProviderRegistry.resolve(platformCode);
    const result = await this.tokenRefreshService.refreshConnectionToken(
      user.companyId,
      provider.platformCode,
    );
    this.socialHubAuditService.record(
      user,
      SocialHubAuditActionCode.ConnectionTokenRefresh,
      `/company/social-hub/connections/${platformCode}/refresh-token`,
      { refreshed: result.refreshed, platformCode: provider.platformCode },
    );
    const row = await this.connectionRepository.findOne({
      where: { companyId: user.companyId, platformCode: provider.platformCode },
    });
    return {
      refresh: result,
      connection: row
        ? this.mapConnection(row, this.listProviderMeta())
        : null,
    };
  }

  public async listOutboundDeliveries(
    user: AuthenticatedUserContext,
    query: {
      threadId?: string;
      limit?: number;
      platformCode?: string;
      status?: "ok" | "failed";
      since?: string;
      until?: string;
    },
  ) {
    assertSocialHubRead(user);
    await this.assertSocialHubSubscription(user.companyId);
    const limit = Math.min(Math.max(query.limit ?? 40, 1), 200);
    const rows = await this.outboundDeliveryLogService.list({
      companyId: user.companyId,
      messageThreadId: query.threadId,
      platformCode: query.platformCode,
      status: query.status,
      since: query.since ? new Date(query.since) : undefined,
      until: query.until ? new Date(query.until) : undefined,
      limit,
    });
    const threadLabels = await this.resolveThreadDisplayLabels(
      user.companyId,
      rows.map((row) => row.messageThreadId),
    );
    return {
      deliveries: rows.map((row) => ({
        id: row.id,
        messageThreadId: row.messageThreadId,
        messageId: row.messageId,
        platformCode: row.platformCode,
        platformLabel:
          PLATFORM_LABELS[row.platformCode as SocialPlatformCode] ??
          row.platformCode,
        status: row.status,
        errorMessage: row.errorMessage,
        externalMessageId: row.externalMessageId,
        bodyTextPreview: row.bodyTextPreview,
        messagingThreadUrl: this.slackNotificationService.buildMessagingThreadUrl(
          row.messageThreadId,
        ),
        threadDisplayLabel: threadLabels.get(row.messageThreadId) ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  public async exportOutboundDeliveriesCsv(
    user: AuthenticatedUserContext,
    query: {
      threadId?: string;
      platformCode?: string;
      status?: "ok" | "failed";
      since?: string;
      until?: string;
      limit?: number;
    },
  ): Promise<string> {
    assertSocialHubRead(user);
    await this.assertSocialHubSubscription(user.companyId);
    const limit = Math.min(Math.max(query.limit ?? 500, 1), 2000);
    const rows = await this.outboundDeliveryLogService.list({
      companyId: user.companyId,
      messageThreadId: query.threadId,
      platformCode: query.platformCode,
      status: query.status,
      since: query.since ? new Date(query.since) : undefined,
      until: query.until ? new Date(query.until) : undefined,
      limit,
    });
    const threadLabels = await this.resolveThreadDisplayLabels(
      user.companyId,
      rows.map((row) => row.messageThreadId),
    );
    return this.outboundDeliveryLogService.buildCsv(rows, threadLabels);
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
    row.statusCode = SocialConnectionStatusCode.PendingOAuth;
    row.lastErrorMessage =
      oauth.implementationStatus === "pending" ? oauth.message : null;
    await this.connectionRepository.save(row);
    return {
      oauth,
      connection: this.mapConnection(row, this.listProviderMeta()),
    };
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
      row.accessTokenCiphertext = null;
      await this.connectionRepository.save(row);
    }
    return {
      connection: row ? this.mapConnection(row, this.listProviderMeta()) : null,
    };
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
      healthAlertsEnabled?: boolean;
      healthAlertMinSeverity?: "attention" | "critical";
      healthAlertFailureThreshold?: number;
      healthAlertPlatformThresholdsJson?: string | null;
      socialSlackWebhookUrl?: string | null;
      socialSlackUseMessagingFallback?: boolean;
      socialSlackNotifyOutboundFailures?: boolean;
      socialSlackOutboundFailureCooldownMinutes?: number;
      socialSlackDailyDigestEnabled?: boolean;
      healthAlertSlackCooldownMinutes?: number;
      socialSlackDigestBusinessHoursOnly?: boolean;
      socialSlackDigestTimezone?: string;
      socialSlackDigestHourStart?: number;
      socialSlackDigestHourEnd?: number;
      socialHubWeeklyEmailEnabled?: boolean;
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
    if (patch.healthAlertsEnabled !== undefined) {
      settings.healthAlertsEnabled = patch.healthAlertsEnabled;
    }
    if (patch.healthAlertMinSeverity !== undefined) {
      settings.healthAlertMinSeverity = patch.healthAlertMinSeverity;
    }
    if (patch.healthAlertFailureThreshold !== undefined) {
      const value = Math.min(Math.max(Math.floor(patch.healthAlertFailureThreshold), 1), 100);
      settings.healthAlertFailureThreshold = value;
    }
    if (patch.healthAlertPlatformThresholdsJson !== undefined) {
      const raw = patch.healthAlertPlatformThresholdsJson?.trim() || null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          if (!parsed || typeof parsed !== "object") {
            throw new ValidationException("Kanal eşik JSON geçersiz.");
          }
        } catch {
          throw new ValidationException(
            "Kanal eşik JSON geçersiz. Örnek: {\"WHATSAPP_CLOUD\":3}",
          );
        }
      }
      settings.healthAlertPlatformThresholdsJson = raw;
    }
    if (patch.socialSlackWebhookUrl !== undefined) {
      settings.socialSlackWebhookUrl = normalizeSocialHubSlackWebhookUrl(
        patch.socialSlackWebhookUrl,
      );
    }
    if (patch.socialSlackUseMessagingFallback !== undefined) {
      settings.socialSlackUseMessagingFallback =
        patch.socialSlackUseMessagingFallback;
    }
    if (patch.socialSlackNotifyOutboundFailures !== undefined) {
      settings.socialSlackNotifyOutboundFailures =
        patch.socialSlackNotifyOutboundFailures;
    }
    if (patch.socialSlackOutboundFailureCooldownMinutes !== undefined) {
      const value = Math.min(
        Math.max(Math.floor(patch.socialSlackOutboundFailureCooldownMinutes), 1),
        24 * 60,
      );
      settings.socialSlackOutboundFailureCooldownMinutes = value;
    }
    if (patch.socialSlackDailyDigestEnabled !== undefined) {
      settings.socialSlackDailyDigestEnabled = patch.socialSlackDailyDigestEnabled;
    }
    if (patch.healthAlertSlackCooldownMinutes !== undefined) {
      const value = Math.min(
        Math.max(Math.floor(patch.healthAlertSlackCooldownMinutes), 15),
        7 * 24 * 60,
      );
      settings.healthAlertSlackCooldownMinutes = value;
    }
    if (patch.socialSlackDigestBusinessHoursOnly !== undefined) {
      settings.socialSlackDigestBusinessHoursOnly =
        patch.socialSlackDigestBusinessHoursOnly;
    }
    if (patch.socialSlackDigestTimezone !== undefined) {
      settings.socialSlackDigestTimezone = normalizeSocialHubDigestTimezone(
        patch.socialSlackDigestTimezone,
      );
    }
    if (patch.socialSlackDigestHourStart !== undefined) {
      settings.socialSlackDigestHourStart = Math.min(
        Math.max(Math.floor(patch.socialSlackDigestHourStart), 0),
        23,
      );
    }
    if (patch.socialSlackDigestHourEnd !== undefined) {
      settings.socialSlackDigestHourEnd = Math.min(
        Math.max(Math.floor(patch.socialSlackDigestHourEnd), 0),
        23,
      );
    }
    if (patch.socialHubWeeklyEmailEnabled !== undefined) {
      settings.socialHubWeeklyEmailEnabled = patch.socialHubWeeklyEmailEnabled;
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

  public async refreshRoadmapToken(
    user: AuthenticatedUserContext,
    platformCode: string,
  ) {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
    const code = assertRoadmapPlatformCode(platformCode);
    const result = await this.roadmapTokenRefreshService.refreshRoadmapToken(
      user.companyId,
      code,
    );
    if (!result.refreshed) {
      throw new ValidationException(result.message);
    }
    this.socialHubAuditService.record(
      user,
      SocialHubAuditActionCode.ConnectionTokenRefresh,
      `/company/social-hub/roadmap/${code}/refresh-token`,
      { refreshed: true, platformCode: code },
    );
    const row = await this.connectionRepository.findOne({
      where: { companyId: user.companyId, platformCode: code },
    });
    const connectionRows = await this.connectionRepository.find({
      where: { companyId: user.companyId },
    });
    return {
      refresh: result,
      connection: row
        ? this.mapConnection(row, this.listProviderMeta())
        : null,
      roadmapProviders: this.mapRoadmapProviders(
        await this.ensureSettings(user.companyId),
        connectionRows,
      ),
    };
  }

  public async startRoadmapConnect(
    user: AuthenticatedUserContext,
    platformCode: string,
  ) {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
    const code = assertRoadmapPlatformCode(platformCode);
    const oauth = await this.roadmapOAuthApplicationService.startConnect(
      user.companyId,
      code,
    );
    const row = await this.connectionRepository.findOne({
      where: { companyId: user.companyId, platformCode: code },
    });
    if (row && oauth.implementationStatus === "ready") {
      row.statusCode = SocialConnectionStatusCode.PendingOAuth;
      row.lastErrorMessage = null;
      await this.connectionRepository.save(row);
    }
    if (row && oauth.implementationStatus === "pending") {
      row.lastErrorMessage = oauth.message;
      await this.connectionRepository.save(row);
    }
    this.socialHubAuditService.record(
      user,
      SocialHubAuditActionCode.SettingsUpdate,
      `/company/social-hub/roadmap/${code}/connect`,
      { roadmapConnect: true },
    );
    return { oauth };
  }

  public async disconnectRoadmapPlatform(
    user: AuthenticatedUserContext,
    platformCode: string,
  ) {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
    const code = assertRoadmapPlatformCode(platformCode);
    const row = await this.connectionRepository.findOne({
      where: { companyId: user.companyId, platformCode: code },
    });
    if (row) {
      row.statusCode = SocialConnectionStatusCode.Disconnected;
      row.accessTokenCiphertext = null;
      row.tokenExpiresAt = null;
      row.connectedAt = null;
      row.lastErrorMessage = null;
      await this.connectionRepository.save(row);
    }
    this.socialHubAuditService.record(
      user,
      SocialHubAuditActionCode.SettingsUpdate,
      `/company/social-hub/roadmap/${code}/disconnect`,
      { roadmapDisconnect: true },
    );
    return { disconnected: true };
  }

  public async setRoadmapInterest(
    user: AuthenticatedUserContext,
    platformCode: string,
    interested: boolean,
  ) {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
    const code = assertRoadmapPlatformCode(platformCode);
    const settings = await this.ensureSettings(user.companyId);
    const current = parseRoadmapInterestPlatformCodes(
      settings.roadmapInterestPlatformCodesJson,
    );
    const next = interested
      ? [...new Set([...current, code])].sort()
      : current.filter((row) => row !== code);
    settings.roadmapInterestPlatformCodesJson =
      serializeRoadmapInterestPlatformCodes(next);
    await this.settingsRepository.save(settings);
    const connectionRows = await this.connectionRepository.find({
      where: { companyId: user.companyId },
    });
    this.socialHubAuditService.record(
      user,
      SocialHubAuditActionCode.SettingsUpdate,
      `/company/social-hub/roadmap/${code}/interest`,
      { platformCode: code, interested },
    );
    return {
      roadmapProviders: this.mapRoadmapProviders(settings, connectionRows),
      settings: this.mapSettings(settings),
    };
  }

  public async sendWeeklyEmailNow(user: AuthenticatedUserContext) {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
    const settings = await this.settingsRepository.findOne({
      where: { companyId: user.companyId },
    });
    const cooldownMsg = manualNotifyCooldownMessage(
      settings?.socialHubWeeklyEmailLastSentAt,
      "Haftalık e-posta özet",
    );
    if (cooldownMsg) {
      throw new ValidationException(cooldownMsg);
    }
    const result = await this.weeklyEmailService.sendWeeklyForCompany(
      user.companyId,
      { requireEnabled: false },
    );
    if (!result.sent) {
      throw new ValidationException(result.message);
    }
    this.socialHubAuditService.record(
      user,
      SocialHubAuditActionCode.SettingsUpdate,
      "/company/social-hub/settings/weekly-email-now",
      { weeklyEmailNow: true },
    );
    return result;
  }

  public async sendSlackDigestNow(user: AuthenticatedUserContext) {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
    const settings = await this.settingsRepository.findOne({
      where: { companyId: user.companyId },
    });
    const cooldownMsg = manualNotifyCooldownMessage(
      settings?.socialSlackDailyDigestLastSentAt,
      "Slack günlük özet",
    );
    if (cooldownMsg) {
      throw new ValidationException(cooldownMsg);
    }
    const result = await this.slackDigestService.sendDigestForCompany(
      user.companyId,
      { requireDigestEnabled: false, enforceDailyInterval: false },
    );
    if (!result.sent) {
      throw new ValidationException(result.message);
    }
    this.socialHubAuditService.record(
      user,
      SocialHubAuditActionCode.SettingsUpdate,
      "/company/social-hub/settings/slack-digest-now",
      { slackDigestNow: true },
    );
    return result;
  }

  public async sendSlackTest(user: AuthenticatedUserContext) {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
    try {
      const result = await this.slackNotificationService.postTestMessage(
        user.companyId,
      );
      if (!result.ok) {
        throw new ValidationException(result.message);
      }
      this.socialHubAuditService.record(
        user,
        SocialHubAuditActionCode.SettingsUpdate,
        "/company/social-hub/settings/slack-test",
        { slackTest: true },
      );
      return result;
    } catch (error) {
      if (error instanceof ValidationException) {
        throw error;
      }
      throw new ValidationException(
        "Slack test mesajı gönderilemedi. Webhook URL'sini kontrol edin.",
      );
    }
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

  public async listAuditLog(
    user: AuthenticatedUserContext,
    focus?: string,
  ) {
    assertSocialHubAdmin(user);
    await this.assertSocialHubSubscription(user.companyId);
    const webhookFocus = focus === "webhook";
    const entries = await this.socialHubAuditService.listRecent(
      user.companyId,
      webhookFocus ? 50 : 25,
      webhookFocus
        ? SocialHubAuditActionCode.WebhookInboundBridged
        : undefined,
    );
    return { entries, focus: webhookFocus ? "webhook" : "all" };
  }

  public async syncInbox(user: AuthenticatedUserContext, platformCode: string) {
    assertSocialHubRead(user);
    await this.assertSocialHubSubscription(user.companyId);
    const settings = await this.ensureSettings(user.companyId);
    this.assertInboxOperationsAllowed(settings);
    if (isRoadmapPlatformCode(platformCode)) {
      const result = await this.roadmapInboxSyncService.summarize(
        user.companyId,
        platformCode,
      );
      this.socialHubAuditService.record(
        user,
        SocialHubAuditActionCode.RoadmapInboxSync,
        `/company/social-hub/connections/${platformCode}/sync-inbox`,
        {
          platformCode,
          openThreadCount: result.importedThreadCount,
        },
      );
      return { sync: result };
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
        healthAlertsEnabled: true,
        healthAlertLastSentAt: null,
        lastHealthAlertStatus: null,
        healthAlertMinSeverity: "attention",
        healthAlertFailureThreshold: 1,
        healthAlertPlatformThresholdsJson: null,
        socialSlackWebhookUrl: null,
        socialSlackUseMessagingFallback: true,
        socialSlackNotifyOutboundFailures: false,
        socialSlackOutboundFailureCooldownMinutes: 15,
        socialSlackDailyDigestEnabled: false,
        socialSlackDailyDigestLastSentAt: null,
        healthAlertSlackCooldownMinutes: 1440,
        socialSlackDigestBusinessHoursOnly: false,
        socialSlackDigestTimezone: "Europe/Istanbul",
        socialSlackDigestHourStart: 9,
        socialSlackDigestHourEnd: 18,
        socialHubWeeklyEmailEnabled: false,
        socialHubWeeklyEmailLastSentAt: null,
      }),
    );
  }

  private async resolveThreadDisplayLabels(
    companyId: string,
    threadIds: string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(threadIds.filter(Boolean))];
    if (unique.length === 0) {
      return new Map();
    }
    const links = await this.threadLinkRepository.find({
      where: { companyId, messageThreadId: In(unique) },
    });
    return new Map(links.map((link) => [link.messageThreadId, link.displayLabel]));
  }

  private async listConnectionRows(
    companyId: string,
    existing?: CompanySocialConnectionEntity[],
  ): Promise<CompanySocialConnectionEntity[]> {
    const allExisting =
      existing ??
      (await this.connectionRepository.find({
        where: { companyId },
      }));
    const byPlatform = new Map(allExisting.map((row) => [row.platformCode, row]));
    const rows: CompanySocialConnectionEntity[] = [];
    for (const platform of this.socialProviderRegistry.listPlatforms()) {
      const row =
        byPlatform.get(platform) ??
        (await this.ensureConnectionRow(companyId, platform));
      rows.push(row);
    }
    for (const provider of SOCIAL_HUB_ROADMAP_PROVIDERS) {
      const row = byPlatform.get(provider.platformCode);
      if (row) {
        rows.push(row);
      }
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

  private listProviderMeta(): Array<{
    platformCode: SocialPlatformCode;
    implementationStatus: "pending" | "ready";
  }> {
    return this.socialProviderRegistry.listPlatforms().map((code) => ({
      platformCode: code,
      implementationStatus:
        this.socialProviderRegistry.resolve(code).getImplementationStatus(),
    }));
  }

  private mapRoadmapProviders(
    settings: CompanySocialSettingsEntity,
    connectionRows: CompanySocialConnectionEntity[],
  ) {
    const interested = new Set(
      parseRoadmapInterestPlatformCodes(settings.roadmapInterestPlatformCodesJson),
    );
    const rowByCode = new Map(
      connectionRows.map((row) => [row.platformCode, row]),
    );
    return SOCIAL_HUB_ROADMAP_PROVIDERS.map((provider) => {
      const conn = rowByCode.get(provider.platformCode);
      return {
        ...provider,
        capabilities: getRoadmapProviderCapabilities(provider.platformCode),
        roadmapInterested: interested.has(provider.platformCode),
        oauthEnvConfigured: isRoadmapOAuthEnvConfigured(provider.platformCode),
        roadmapConnectionStatusCode: conn?.statusCode ?? null,
        roadmapHasRefreshToken: conn
          ? hasRoadmapRefreshToken(conn.grantedScopes)
          : false,
      };
    });
  }

  private mapSettings(row: CompanySocialSettingsEntity) {
    return {
      inboxEnabled: row.inboxEnabled,
      publishingEnabled: row.publishingEnabled,
      dispatcherCanReply: row.dispatcherCanReply,
      dispatcherCanPublish: row.dispatcherCanPublish,
      ownerApprovalRequired: row.ownerApprovalRequired,
      kvkkAcceptedAt: row.kvkkAcceptedAt?.toISOString() ?? null,
      healthAlertsEnabled: row.healthAlertsEnabled ?? true,
      healthAlertMinSeverity: row.healthAlertMinSeverity ?? "attention",
      healthAlertFailureThreshold: row.healthAlertFailureThreshold ?? 1,
      healthAlertPlatformThresholdsJson:
        row.healthAlertPlatformThresholdsJson ?? null,
      socialSlackWebhookUrl: row.socialSlackWebhookUrl ?? null,
      socialSlackUseMessagingFallback:
        row.socialSlackUseMessagingFallback ?? true,
      socialSlackNotifyOutboundFailures:
        row.socialSlackNotifyOutboundFailures ?? false,
      socialSlackOutboundFailureCooldownMinutes:
        row.socialSlackOutboundFailureCooldownMinutes ?? 15,
      socialSlackDailyDigestEnabled: row.socialSlackDailyDigestEnabled ?? false,
      socialSlackDailyDigestLastSentAt:
        row.socialSlackDailyDigestLastSentAt?.toISOString() ?? null,
      healthAlertSlackCooldownMinutes:
        row.healthAlertSlackCooldownMinutes ?? 1440,
      socialSlackDigestBusinessHoursOnly:
        row.socialSlackDigestBusinessHoursOnly ?? false,
      socialSlackDigestTimezone: row.socialSlackDigestTimezone ?? "Europe/Istanbul",
      socialSlackDigestHourStart: row.socialSlackDigestHourStart ?? 9,
      socialSlackDigestHourEnd: row.socialSlackDigestHourEnd ?? 18,
      socialHubWeeklyEmailEnabled: row.socialHubWeeklyEmailEnabled ?? false,
      socialHubWeeklyEmailLastSentAt:
        row.socialHubWeeklyEmailLastSentAt?.toISOString() ?? null,
      roadmapInterestPlatformCodes: parseRoadmapInterestPlatformCodes(
        row.roadmapInterestPlatformCodesJson,
      ),
    };
  }

  private mapConnection(
    row: CompanySocialConnectionEntity,
    providers: Array<{
      platformCode: SocialPlatformCode;
      implementationStatus: "pending" | "ready";
    }>,
  ) {
    const platform = row.platformCode as SocialPlatformCode;
    const providerMeta = providers.find((p) => p.platformCode === platform);
    const metadata = parseSocialHubConnectionMetadata(row.grantedScopes);
    const setupWarnings: string[] = [];
    if (row.statusCode === SocialConnectionStatusCode.Connected) {
      if (platform === SocialPlatformCode.WhatsAppCloud && !metadata.phoneNumberId) {
        setupWarnings.push(
          "WhatsApp phone_number_id eksik — bağlantıyı yenileyin (OAuth).",
        );
      }
      if (
        platform === SocialPlatformCode.Instagram &&
        !metadata.instagramBusinessAccountId
      ) {
        setupWarnings.push(
          "Instagram işletme hesabı tanımlı değil — sayfa bağlantısını yenileyin.",
        );
      }
      if (
        row.tokenExpiresAt &&
        row.tokenExpiresAt.getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000
      ) {
        setupWarnings.push("Erişim tokenı yakında sona eriyor — yeniden bağlanın.");
      }
    }
    if (providerMeta?.implementationStatus === "pending") {
      setupWarnings.push("Sunucu OAuth yapılandırması eksik.");
    }
    const roadmapProvider = isRoadmapPlatformCode(row.platformCode)
      ? SOCIAL_HUB_ROADMAP_PROVIDERS.find(
          (item) => item.platformCode === row.platformCode,
        )
      : null;
    if (
      roadmapProvider &&
      row.statusCode === SocialConnectionStatusCode.Connected
    ) {
      setupWarnings.push(roadmapConnectedHint(row.platformCode));
    }
    const capabilities = roadmapProvider
      ? getRoadmapProviderCapabilities(row.platformCode)
      : getSocialHubProviderCapabilities(platform);
    const oauthReady = roadmapProvider
      ? isRoadmapOAuthEnvConfigured(row.platformCode)
      : providerMeta?.implementationStatus === "ready";
    return {
      id: row.id,
      platformCode: row.platformCode,
      label:
        PLATFORM_LABELS[platform as SocialPlatformCode] ??
        labelSocialPlatform(row.platformCode),
      statusCode: row.statusCode,
      externalAccountId: row.externalAccountId,
      displayName: row.displayName,
      profileUrl: row.profileUrl,
      lastErrorMessage: row.lastErrorMessage,
      connectedAt: row.connectedAt?.toISOString() ?? null,
      tokenExpiresAt: row.tokenExpiresAt?.toISOString() ?? null,
      capabilities,
      setupWarnings,
      oauthReady,
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
