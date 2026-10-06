import { PublicApiConfiguration } from "./PublicApiConfiguration";
import type {
  SocialHubAnalytics,
  SocialHubAuditEntry,
  SocialHubHealth,
  SocialHubInboxThreadPreview,
  SocialHubNotificationInsights,
  SocialHubOutboundDelivery,
  SocialHubPost,
  SocialHubSnapshot,
  SocialHubTeamMember,
  SocialHubTemplate,
} from "./socialHubTypes";
import { normalizeSocialHubSnapshot } from "./normalizeSocialHubSnapshot";

async function socialHubFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${PublicApiConfiguration.resolveBaseUrl()}/company/social-hub${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Social hub request failed");
  }
  return (await response.json()) as T;
}

export class SocialHubApiClient {
  public static async fetchAnalytics(
    accessToken: string,
  ): Promise<SocialHubAnalytics> {
    const payload = await socialHubFetch<{ analytics: SocialHubAnalytics }>(
      accessToken,
      "/analytics",
    );
    const analytics = payload.analytics;
    return {
      ...analytics,
      webhookBridge: analytics.webhookBridge ?? {
        inboundBridged24h: 0,
        inboundBridged7d: 0,
        inboundBridged30d: 0,
        lastInboundBridgedAt: null,
        byPlatform24h: [],
        byPlatform7d: [],
      },
    };
  }

  public static buildAuditLogExportUrl(focus?: "webhook" | "all"): string {
    const query =
      focus === "webhook" ? "?focus=webhook" : "";
    return `${PublicApiConfiguration.resolveBaseUrl()}/company/social-hub/audit-log/export${query}`;
  }

  public static async downloadAuditLogExport(
    accessToken: string,
    focus?: "webhook" | "all",
  ): Promise<void> {
    const response = await fetch(this.buildAuditLogExportUrl(focus), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error("Denetim CSV indirilemedi.");
    }
    const blob = await response.blob();
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download =
      focus === "webhook"
        ? "social-hub-audit-webhook.csv"
        : "social-hub-audit-log.csv";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  public static async fetchSnapshot(
    accessToken: string,
  ): Promise<SocialHubSnapshot> {
    const payload = await socialHubFetch<unknown>(accessToken, "");
    return normalizeSocialHubSnapshot(payload);
  }

  public static async fetchInboxThreadsPreview(
    accessToken: string,
    limit = 10,
  ): Promise<SocialHubInboxThreadPreview[]> {
    const payload = await socialHubFetch<{ threads: SocialHubInboxThreadPreview[] }>(
      accessToken,
      `/inbox/threads-preview?limit=${limit}`,
    );
    return payload.threads ?? [];
  }

  public static async fetchHealth(accessToken: string): Promise<{
    health: SocialHubHealth;
    notificationInsights: SocialHubNotificationInsights;
  }> {
    const payload = await socialHubFetch<{
      health: SocialHubHealth;
      notificationInsights: SocialHubNotificationInsights;
    }>(accessToken, "/health");
    return {
      health: {
        ...payload.health,
        roadmapChannels: payload.health.roadmapChannels ?? [],
      },
      notificationInsights: {
        healthAlertEmailLastSentAt:
          payload.notificationInsights?.healthAlertEmailLastSentAt ?? null,
        lastHealthAlertStatus:
          payload.notificationInsights?.lastHealthAlertStatus ?? null,
        slackDailyDigestLastSentAt:
          payload.notificationInsights?.slackDailyDigestLastSentAt ?? null,
        slackHealthAlertLastSentAt:
          payload.notificationInsights?.slackHealthAlertLastSentAt ?? null,
        slackOutboundFailureLastSentAt:
          payload.notificationInsights?.slackOutboundFailureLastSentAt ?? null,
        weeklyEmailLastSentAt:
          payload.notificationInsights?.weeklyEmailLastSentAt ?? null,
        outboundDeliveriesLast24h:
          payload.notificationInsights?.outboundDeliveriesLast24h ?? {
            ok: 0,
            failed: 0,
          },
        channelOutbound24h: payload.notificationInsights?.channelOutbound24h ?? [],
        roadmapBetaOutbound24h:
          payload.notificationInsights?.roadmapBetaOutbound24h ?? [],
        roadmapBetaChannelHealth:
          payload.notificationInsights?.roadmapBetaChannelHealth ?? [],
        channelOutbound7d: payload.notificationInsights?.channelOutbound7d ?? [],
        channelOutbound30d:
          payload.notificationInsights?.channelOutbound30d ?? [],
        outboundDeliveriesLast7d:
          payload.notificationInsights?.outboundDeliveriesLast7d ?? {
            ok: 0,
            failed: 0,
          },
        outboundDeliveriesLast30d:
          payload.notificationInsights?.outboundDeliveriesLast30d ?? {
            ok: 0,
            failed: 0,
          },
        manualNotifyCooldownMinutes:
          payload.notificationInsights?.manualNotifyCooldownMinutes ?? 15,
        roadmapInterestPlatformCodes:
          payload.notificationInsights?.roadmapInterestPlatformCodes ?? [],
        roadmapInterestLabels:
          payload.notificationInsights?.roadmapInterestLabels ?? [],
        webhookInboundBridged24h:
          payload.notificationInsights?.webhookInboundBridged24h ?? 0,
        webhookInboundBridgedByPlatform24h:
          payload.notificationInsights?.webhookInboundBridgedByPlatform24h ??
          [],
      },
    };
  }

  public static async sendWeeklyEmailNow(accessToken: string): Promise<{
    sent: boolean;
    message: string;
  }> {
    return socialHubFetch(accessToken, "/settings/weekly-email-now", {
      method: "POST",
    });
  }

  public static buildInsightsExportUrl(): string {
    return `${PublicApiConfiguration.resolveBaseUrl()}/company/social-hub/health/insights/export`;
  }

  public static buildAnalyticsExportUrl(): string {
    return `${PublicApiConfiguration.resolveBaseUrl()}/company/social-hub/analytics/export`;
  }

  public static async downloadAnalyticsExport(accessToken: string): Promise<void> {
    const response = await fetch(this.buildAnalyticsExportUrl(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error("Analitik CSV indirilemedi.");
    }
    const blob = await response.blob();
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "social-hub-analytics.csv";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  public static buildWebhookActivityExportUrl(): string {
    return `${PublicApiConfiguration.resolveBaseUrl()}/company/social-hub/health/webhook-activity/export`;
  }

  public static async downloadWebhookActivityExport(
    accessToken: string,
  ): Promise<void> {
    const response = await fetch(this.buildWebhookActivityExportUrl(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error("Webhook aktivite CSV indirilemedi.");
    }
    const blob = await response.blob();
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "social-hub-webhook-activity.csv";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  public static async downloadInsightsExport(accessToken: string): Promise<void> {
    const response = await fetch(this.buildInsightsExportUrl(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error("Insights CSV indirilemedi.");
    }
    const blob = await response.blob();
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = "social-hub-insights.csv";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  public static buildDeliveryExportUrl(params?: {
    threadId?: string;
    platformCode?: string;
    status?: "ok" | "failed";
    since?: string;
    until?: string;
    limit?: number;
  }): string {
    const query = new URLSearchParams();
    if (params?.threadId) {
      query.set("threadId", params.threadId);
    }
    if (params?.platformCode) {
      query.set("platformCode", params.platformCode);
    }
    if (params?.status) {
      query.set("status", params.status);
    }
    if (params?.since) {
      query.set("since", params.since);
    }
    if (params?.until) {
      query.set("until", params.until);
    }
    if (params?.limit) {
      query.set("limit", String(params.limit));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return `${PublicApiConfiguration.resolveBaseUrl()}/company/social-hub/delivery-log/export${suffix}`;
  }

  public static async fetchDeliveryLog(
    accessToken: string,
    params?: {
      threadId?: string;
      limit?: number;
      platformCode?: string;
      status?: "ok" | "failed";
      since?: string;
      until?: string;
    },
  ): Promise<SocialHubOutboundDelivery[]> {
    const query = new URLSearchParams();
    if (params?.threadId) {
      query.set("threadId", params.threadId);
    }
    if (params?.limit) {
      query.set("limit", String(params.limit));
    }
    if (params?.platformCode) {
      query.set("platformCode", params.platformCode);
    }
    if (params?.status) {
      query.set("status", params.status);
    }
    if (params?.since) {
      query.set("since", params.since);
    }
    if (params?.until) {
      query.set("until", params.until);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const payload = await socialHubFetch<{
      deliveries: SocialHubOutboundDelivery[];
    }>(accessToken, `/delivery-log${suffix}`);
    return payload.deliveries;
  }

  public static async downloadDeliveryExport(
    accessToken: string,
    params?: {
      threadId?: string;
      platformCode?: string;
      status?: "ok" | "failed";
      since?: string;
      until?: string;
      limit?: number;
    },
  ): Promise<void> {
    const url = SocialHubApiClient.buildDeliveryExportUrl(params);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error("CSV export failed");
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "social-hub-deliveries.csv";
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  public static async refreshConnectionToken(
    accessToken: string,
    platformCode: string,
  ): Promise<{ refresh: { refreshed: boolean; message: string } }> {
    return socialHubFetch(
      accessToken,
      `/connections/${platformCode}/refresh-token`,
      { method: "POST" },
    );
  }

  public static async setTelegramDiscussionGroup(
    accessToken: string,
    groupRef: string,
  ): Promise<{
    discussionGroup: {
      discussionGroupChatId: string;
      discussionGroupTitle: string | null;
    };
  }> {
    return socialHubFetch(accessToken, "/connections/TELEGRAM/discussion-group", {
      method: "POST",
      body: JSON.stringify({ groupRef }),
    });
  }

  public static async setTelegramPublishChannel(
    accessToken: string,
    channelRef: string,
  ): Promise<{ channel: { channelChatId: string; channelTitle: string | null } }> {
    return socialHubFetch(accessToken, "/connections/TELEGRAM/publish-channel", {
      method: "POST",
      body: JSON.stringify({ channelRef }),
    });
  }

  public static async connectTelegramBot(
    accessToken: string,
    botToken: string,
  ): Promise<{ connection: unknown }> {
    return socialHubFetch(accessToken, "/connections/TELEGRAM/connect-bot", {
      method: "POST",
      body: JSON.stringify({ botToken }),
    });
  }

  public static async connectPlatform(
    accessToken: string,
    platformCode: string,
    webReturnQuery?: string,
  ): Promise<{
    oauth: {
      message: string;
      authorizationUrl?: string | null;
      implementationStatus?: string;
    };
    connection: unknown;
  }> {
    return socialHubFetch(accessToken, `/connections/${platformCode}/connect`, {
      method: "POST",
      body: webReturnQuery
        ? JSON.stringify({ webReturnQuery })
        : undefined,
    });
  }

  public static async disconnectPlatform(
    accessToken: string,
    platformCode: string,
  ): Promise<void> {
    await socialHubFetch(accessToken, `/connections/${platformCode}/disconnect`, {
      method: "POST",
    });
  }

  public static async seedDemoInbox(
    accessToken: string,
  ): Promise<{ createdThreadIds: string[] }> {
    return socialHubFetch(accessToken, "/inbox/seed-demo", { method: "POST" });
  }

  public static async syncInbox(
    accessToken: string,
    platformCode: string,
  ): Promise<{ sync: { message: string; importedThreadCount: number } }> {
    return socialHubFetch(
      accessToken,
      `/connections/${platformCode}/sync-inbox`,
      { method: "POST" },
    );
  }

  public static async fetchScheduledPosts(
    accessToken: string,
    from: string,
    to: string,
  ): Promise<{ posts: SocialHubPost[] }> {
    const query = new URLSearchParams({ from, to });
    return socialHubFetch(accessToken, `/posts?${query.toString()}`);
  }

  public static async bulkCancelPosts(
    accessToken: string,
    postIds: string[],
  ): Promise<{ cancelledIds: string[]; errors: string[] }> {
    return socialHubFetch(accessToken, "/posts/bulk-cancel", {
      method: "POST",
      body: JSON.stringify({ postIds }),
    });
  }

  public static async bulkRetryPosts(
    accessToken: string,
    postIds: string[],
  ): Promise<{
    publishedIds: string[];
    failed: Array<{ postId: string; message: string }>;
  }> {
    return socialHubFetch(accessToken, "/posts/bulk-retry", {
      method: "POST",
      body: JSON.stringify({ postIds }),
    });
  }

  public static async uploadPublishMedia(
    accessToken: string,
    body: { filename: string; contentType: string; contentBase64: string },
  ): Promise<{
    media: {
      mediaRef: string;
      mediaId: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
      previewPath: string;
    };
  }> {
    return socialHubFetch(accessToken, "/publishing/media", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  public static buildPublishMediaPreviewUrl(mediaId: string): string {
    return `${PublicApiConfiguration.resolveBaseUrl()}/company/social-hub/publishing/media/${mediaId}`;
  }

  public static async createPost(
    accessToken: string,
    body: {
      bodyText: string;
      platformCodes: string[];
      mediaUrls?: string[];
      utm?: {
        utmSource?: string | null;
        utmMedium?: string | null;
        utmCampaign?: string | null;
        utmContent?: string | null;
      };
    },
  ): Promise<{ post: { id: string } }> {
    return socialHubFetch(accessToken, "/posts", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  public static async updatePost(
    accessToken: string,
    postId: string,
    body: {
      bodyText?: string;
      platformCodes?: string[];
      scheduledAt?: string | null;
    },
  ): Promise<{ post: unknown }> {
    return socialHubFetch(accessToken, `/posts/${postId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  public static async deletePost(
    accessToken: string,
    postId: string,
  ): Promise<void> {
    await socialHubFetch(accessToken, `/posts/${postId}`, { method: "DELETE" });
  }

  public static async submitPostForApproval(
    accessToken: string,
    postId: string,
  ): Promise<{ post: unknown }> {
    return socialHubFetch(accessToken, `/posts/${postId}/submit-approval`, {
      method: "POST",
    });
  }

  public static async approvePost(
    accessToken: string,
    postId: string,
  ): Promise<{ post: unknown }> {
    return socialHubFetch(accessToken, `/posts/${postId}/approve`, {
      method: "POST",
    });
  }

  public static async cancelPost(
    accessToken: string,
    postId: string,
  ): Promise<{ post: unknown }> {
    return socialHubFetch(accessToken, `/posts/${postId}/cancel`, {
      method: "POST",
    });
  }

  public static async publishPost(
    accessToken: string,
    postId: string,
  ): Promise<{
    post: {
      statusCode: string;
      lastErrorMessage?: string | null;
    };
    providerMessage?: string;
  }> {
    return socialHubFetch(accessToken, `/posts/${postId}/publish`, {
      method: "POST",
    });
  }

  public static async listTemplateVariables(accessToken: string): Promise<{
    variables: Array<{
      key: string;
      placeholder: string;
      description: string;
    }>;
  }> {
    return socialHubFetch(accessToken, "/templates/variables");
  }

  public static async previewTemplate(
    accessToken: string,
    bodyText: string,
  ): Promise<{ renderedText: string; variables: Record<string, string> }> {
    return socialHubFetch(accessToken, "/templates/preview", {
      method: "POST",
      body: JSON.stringify({ bodyText }),
    });
  }

  public static async renderTemplate(
    accessToken: string,
    templateId: string,
  ): Promise<{
    template: SocialHubTemplate;
    renderedText: string;
    variables: Record<string, string>;
  }> {
    return socialHubFetch(accessToken, `/templates/${templateId}/render`, {
      method: "POST",
    });
  }

  public static async createTemplate(
    accessToken: string,
    body: {
      title: string;
      bodyText: string;
      channelScopeCode?: string | null;
    },
  ): Promise<void> {
    await socialHubFetch(accessToken, "/templates", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  public static async updateSettings(
    accessToken: string,
    body: Record<string, boolean | string | number | null | undefined>,
  ): Promise<void> {
    await socialHubFetch(accessToken, "/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  public static async sendSlackDigestNow(accessToken: string): Promise<{
    ok: boolean;
    message: string;
  }> {
    return socialHubFetch(accessToken, "/settings/slack-digest-now", {
      method: "POST",
    });
  }

  public static async connectRoadmapPlatform(
    accessToken: string,
    platformCode: string,
    webReturnQuery?: string,
  ): Promise<{
    oauth: {
      implementationStatus: string;
      authorizationUrl: string | null;
      message: string;
    };
  }> {
    return socialHubFetch(accessToken, `/roadmap/${platformCode}/connect`, {
      method: "POST",
      body: webReturnQuery
        ? JSON.stringify({ webReturnQuery })
        : undefined,
    });
  }

  public static async refreshRoadmapToken(
    accessToken: string,
    platformCode: string,
  ): Promise<{
    refresh: { refreshed: boolean; message: string };
    roadmapProviders?: SocialHubSnapshot["roadmapProviders"];
  }> {
    return socialHubFetch(accessToken, `/roadmap/${platformCode}/refresh-token`, {
      method: "POST",
    });
  }

  public static async disconnectRoadmapPlatform(
    accessToken: string,
    platformCode: string,
  ): Promise<{ disconnected: boolean }> {
    return socialHubFetch(accessToken, `/roadmap/${platformCode}/disconnect`, {
      method: "POST",
    });
  }

  public static async setRoadmapInterest(
    accessToken: string,
    platformCode: string,
    interested: boolean,
  ): Promise<{
    roadmapProviders: SocialHubSnapshot["roadmapProviders"];
    settings: SocialHubSnapshot["settings"];
  }> {
    return socialHubFetch(accessToken, `/roadmap/${platformCode}/interest`, {
      method: "POST",
      body: JSON.stringify({ interested }),
    });
  }

  public static async sendSlackTest(accessToken: string): Promise<{
    ok: boolean;
    message: string;
    usedDedicatedWebhook: boolean;
  }> {
    return socialHubFetch(accessToken, "/settings/slack-test", {
      method: "POST",
    });
  }

  public static async fetchTeam(accessToken: string): Promise<{
    members: SocialHubTeamMember[];
    assignableRoleCodes: string[];
    integrationsPath: string;
  }> {
    return socialHubFetch(accessToken, "/team");
  }

  public static async updateMemberRole(
    accessToken: string,
    userId: string,
    roleCode: string,
  ): Promise<void> {
    await socialHubFetch(accessToken, `/team/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ roleCode }),
    });
  }

  public static async fetchAuditLog(
    accessToken: string,
    focus?: "webhook" | "all",
  ): Promise<{
    entries: SocialHubAuditEntry[];
    focus?: string;
  }> {
    const query = focus === "webhook" ? "?focus=webhook" : "";
    return socialHubFetch(accessToken, `/audit-log${query}`);
  }
}
