import type { SocialHubSnapshot } from "./socialHubTypes";

const DEFAULT_PERMISSIONS: SocialHubSnapshot["permissions"] = {
  canManageConnections: false,
  canPublish: false,
  canApprovePosts: false,
  canSubmitForApproval: false,
  canReply: false,
  canManageTemplates: false,
  canManageSettings: false,
};

const DEFAULT_SETTINGS: SocialHubSnapshot["settings"] = {
  inboxEnabled: true,
  publishingEnabled: true,
  dispatcherCanReply: false,
  dispatcherCanPublish: false,
  ownerApprovalRequired: true,
  kvkkAcceptedAt: null,
  healthAlertsEnabled: true,
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
};

export function normalizeSocialHubSnapshot(payload: unknown): SocialHubSnapshot {
  if (!payload || typeof payload !== "object") {
    throw new Error("SOCIAL_HUB_SNAPSHOT_INVALID");
  }
  const root = payload as Record<string, unknown>;
  const hub = (root.hub ?? root) as Record<string, unknown>;
  if (!hub || typeof hub !== "object") {
    throw new Error("SOCIAL_HUB_SNAPSHOT_INVALID");
  }
  const permissions = {
    ...DEFAULT_PERMISSIONS,
    ...(hub.permissions as SocialHubSnapshot["permissions"] | undefined),
  };
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(hub.settings as SocialHubSnapshot["settings"] | undefined),
  };
  const providers = Array.isArray(hub.providers)
    ? (hub.providers as SocialHubSnapshot["providers"])
    : [];
  const connections = Array.isArray(hub.connections)
    ? (hub.connections as SocialHubSnapshot["connections"]).map((row) => ({
        ...row,
        setupWarnings: Array.isArray(row.setupWarnings) ? row.setupWarnings : [],
      }))
    : [];
  const inboxRaw = hub.inboxSummary as SocialHubSnapshot["inboxSummary"] | undefined;
  const inboxSummary: SocialHubSnapshot["inboxSummary"] = {
    totalOpenThreads: inboxRaw?.totalOpenThreads ?? 0,
    byPlatform: Array.isArray(inboxRaw?.byPlatform) ? inboxRaw.byPlatform : [],
    messagingDeepLink: inboxRaw?.messagingDeepLink ?? "/messaging?tab=sohbet&filter=social",
    note:
      inboxRaw?.note ??
      "Sosyal konuşmalar Mesajlar listesinde kanal rozetiyle görünür.",
  };
  const subscription = (hub.subscription as SocialHubSnapshot["subscription"]) ?? {
    moduleCode: "SOCIAL_HUB",
    upgradeHintPath: "/hesap/abonelik",
  };
  return {
    subscription,
    permissions,
    settings,
    providers,
    connections,
    recentPosts: Array.isArray(hub.recentPosts)
      ? (hub.recentPosts as SocialHubSnapshot["recentPosts"])
      : [],
    templates: Array.isArray(hub.templates)
      ? (hub.templates as SocialHubSnapshot["templates"])
      : [],
    inboxSummary,
  };
}
