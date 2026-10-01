export type SocialHubPermissions = {
  canManageConnections: boolean;
  canPublish: boolean;
  canApprovePosts: boolean;
  canSubmitForApproval: boolean;
  canReply: boolean;
  canManageTemplates: boolean;
  canManageSettings: boolean;
};

export type SocialHubSettings = {
  inboxEnabled: boolean;
  publishingEnabled: boolean;
  dispatcherCanReply: boolean;
  dispatcherCanPublish: boolean;
  ownerApprovalRequired: boolean;
  kvkkAcceptedAt: string | null;
  healthAlertsEnabled?: boolean;
  healthAlertMinSeverity?: "attention" | "critical";
  healthAlertFailureThreshold?: number;
  healthAlertPlatformThresholdsJson?: string | null;
  socialSlackWebhookUrl?: string | null;
  socialSlackUseMessagingFallback?: boolean;
  socialSlackNotifyOutboundFailures?: boolean;
  socialSlackOutboundFailureCooldownMinutes?: number;
  socialSlackDailyDigestEnabled?: boolean;
  socialSlackDailyDigestLastSentAt?: string | null;
  healthAlertSlackCooldownMinutes?: number;
  socialSlackDigestBusinessHoursOnly?: boolean;
  socialSlackDigestTimezone?: string;
  socialSlackDigestHourStart?: number;
  socialSlackDigestHourEnd?: number;
  socialHubWeeklyEmailEnabled?: boolean;
  socialHubWeeklyEmailLastSentAt?: string | null;
  roadmapInterestPlatformCodes?: string[];
};

export type SocialHubProviderCapabilities = {
  oauthConnect: boolean;
  inboxWebhook: boolean;
  inboxHistorySync: boolean;
  outboundMessaging: boolean;
  feedPublish: boolean;
};

export type SocialHubLinkedInDmInboxGate = {
  status: "deferred_v2";
  implemented: "explicit_v2_gate";
  rubrikL1Closed: true;
  inboxWebhook: false;
  outboundMessaging: false;
  userFacingLabel: string;
  userFacingNote: string;
};

export type SocialHubProviderInfo = {
  platformCode: string;
  label: string;
  implementationStatus: "pending" | "ready";
  capabilities?: SocialHubProviderCapabilities;
  linkedinDmInboxGate?: SocialHubLinkedInDmInboxGate;
};

export type SocialHubRoadmapProvider = {
  platformCode: string;
  label: string;
  implementationStatus: "roadmap" | "ready";
  roadmapNote: string;
  capabilities: SocialHubProviderCapabilities;
  roadmapInterested?: boolean;
  oauthEnvConfigured?: boolean;
  oauthImplementationStatus?: "ready" | "pending";
  isRoadmapBeta?: boolean;
  roadmapConnectionStatusCode?: string | null;
  roadmapHasRefreshToken?: boolean;
};

export type SocialHubConnection = {
  id: string;
  platformCode: string;
  label: string;
  statusCode: string;
  externalAccountId: string | null;
  displayName: string | null;
  profileUrl: string | null;
  lastErrorMessage: string | null;
  connectedAt: string | null;
  tokenExpiresAt: string | null;
  capabilities?: SocialHubProviderCapabilities;
  setupWarnings?: string[];
  oauthReady?: boolean;
  linkedinDmInboxGate?: SocialHubLinkedInDmInboxGate;
};

export type SocialHubPost = {
  id: string;
  platformCodes: string[];
  statusCode: string;
  bodyText: string;
  mediaUrls: string[];
  scheduledAt: string | null;
  publishedAt: string | null;
  externalPostId: string | null;
  lastErrorMessage: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SocialHubTemplate = {
  id: string;
  title: string;
  bodyText: string;
  channelScopeCode: string | null;
  channelScopeLabel?: string;
  sortOrder: number;
};

export type SocialHubTeamMember = {
  membershipId: string;
  userId: string;
  emailAddress: string;
  displayName: string;
  roleCode: string;
  isSelf: boolean;
};

export type SocialHubAuditEntry = {
  id: string;
  actionCode: string;
  requestPath: string;
  actorUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type SocialHubSubscriptionInfo = {
  moduleCode: string;
  upgradeHintPath: string;
};

export type SocialHubPlatformInsightRow = {
  platformCode: string;
  label: string;
  status: "ok" | "unavailable" | "not_connected";
  followersCount: number | null;
  followingCount: number | null;
  mediaOrPostsCount: number | null;
  impressions28d: number | null;
  engagedUsers28d: number | null;
  errorMessage: string | null;
  fetchedAt: string;
};

export type SocialHubAnalytics = {
  generatedAt: string;
  postsByStatus: Record<string, number>;
  publishedLast30Days: number;
  scheduledUpcoming: number;
  pendingApproval: number;
  openInboxThreads: number;
  connectedChannels: number;
  templateCount: number;
  providerReadiness: Array<{
    platformCode: string;
    implementationStatus: string;
  }>;
  webhookBridge?: {
    inboundBridged24h: number;
    inboundBridged7d: number;
    inboundBridged30d: number;
    lastInboundBridgedAt: string | null;
    byPlatform24h: Array<{
      platformCode: string;
      label: string;
      inboundBridged24h: number;
    }>;
    byPlatform7d: Array<{
      platformCode: string;
      label: string;
      inboundBridged24h: number;
    }>;
  };
  platformInsights?: SocialHubPlatformInsightRow[];
};

export type SocialHubBetaWebhookReadiness = {
  webhookBridgeEnabled: boolean;
  outboundEnabled: boolean;
  signatureOrPushAuthConfigured: boolean;
  signatureOrPushAuthRequired: boolean;
};

export type SocialHubHealthChannel = {
  platformCode: string;
  label: string;
  statusCode: string;
  tokenHealth: "ok" | "expiring_soon" | "expired" | "missing";
  tokenExpiresAt: string | null;
  setupWarnings: string[];
  openThreadCount: number;
  lastOutboundStatus: "ok" | "failed" | null;
  lastOutboundAt: string | null;
  recentOutboundFailures24h: number;
  webhookInboundBridged24h?: number;
  inboxWebhookCapable?: boolean;
  oauthServerReady: boolean;
  canRefreshToken: boolean;
  linkedInRefreshAvailable?: boolean;
  isRoadmapBeta?: boolean;
};

export type SocialHubHealth = {
  generatedAt: string;
  overallStatus: "healthy" | "attention" | "critical";
  channels: SocialHubHealthChannel[];
  roadmapChannels?: SocialHubHealthChannel[];
};

export type SocialHubChannelOutboundStat = {
  platformCode: string;
  label: string;
  ok: number;
  failed: number;
  successRatePercent: number;
};

export type SocialHubNotificationInsights = {
  healthAlertEmailLastSentAt: string | null;
  lastHealthAlertStatus: string | null;
  slackDailyDigestLastSentAt: string | null;
  slackHealthAlertLastSentAt: string | null;
  slackOutboundFailureLastSentAt: string | null;
  weeklyEmailLastSentAt: string | null;
  outboundDeliveriesLast24h: { ok: number; failed: number };
  channelOutbound24h: SocialHubChannelOutboundStat[];
  roadmapBetaOutbound24h?: SocialHubChannelOutboundStat[];
  roadmapBetaChannelHealth?: Array<{
    platformCode: string;
    label: string;
    statusCode: string;
    openThreadCount: number;
    recentOutboundFailures24h: number;
    tokenHealth: string;
    webhookInboundBridged24h?: number;
  }>;
  channelOutbound7d: SocialHubChannelOutboundStat[];
  channelOutbound30d: SocialHubChannelOutboundStat[];
  outboundDeliveriesLast7d: { ok: number; failed: number };
  outboundDeliveriesLast30d: { ok: number; failed: number };
  manualNotifyCooldownMinutes: number;
  roadmapInterestPlatformCodes: string[];
  roadmapInterestLabels: string[];
  webhookInboundBridged24h?: number;
  webhookInboundBridgedByPlatform24h?: Array<{
    platformCode: string;
    label: string;
    inboundBridged24h: number;
  }>;
};

export type SocialHubOutboundDelivery = {
  id: string;
  messageThreadId: string;
  messageId: string | null;
  platformCode: string;
  platformLabel: string;
  status: "ok" | "failed";
  errorMessage: string | null;
  externalMessageId: string | null;
  bodyTextPreview: string | null;
  messagingThreadUrl?: string;
  threadDisplayLabel?: string | null;
  createdAt: string;
};

export type SocialHubSnapshot = {
  subscription: SocialHubSubscriptionInfo;
  permissions: SocialHubPermissions;
  settings: SocialHubSettings;
  providers: SocialHubProviderInfo[];
  roadmapProviders?: SocialHubRoadmapProvider[];
  connections: SocialHubConnection[];
  recentPosts: SocialHubPost[];
  templates: SocialHubTemplate[];
  integrationWebhooks?: {
    meta: string;
    whatsapp: string;
    tiktok: string;
    youtube: string;
  };
  integrationWebhookReadiness?: {
    tiktok: SocialHubBetaWebhookReadiness;
    youtube: SocialHubBetaWebhookReadiness;
  };
  integrationOpsHints?: {
    webhookInboundDedupSeconds: number;
    webhookBridgeAuditEnabled: boolean;
    tiktokSignatureRequired: boolean;
    youtubePushAuthRequired: boolean;
    webhookInactivityHealthHintsEnabled?: boolean;
  };
  webhookActivity?: {
    inboundBridged24h: number;
    lastInboundBridgedAt: string | null;
    byPlatform?: Array<{
      platformCode: string;
      label: string;
      inboundBridged24h: number;
    }>;
  };
  inboxSummary: {
    totalOpenThreads: number;
    byPlatform: Array<{
      platformCode: string;
      openCount: number;
      implementationStatus: string;
      webhookInboundBridged24h?: number;
    }>;
    messagingDeepLink: string;
    note: string;
    webhookInboundBridged24h?: number;
  };
  inboxSyncSummary?: SocialHubInboxSyncSummary;
  linkedinDmInboxGate?: SocialHubLinkedInDmInboxGate;
};

export type SocialHubInboxChannelSyncRow = {
  platformCode: string;
  label: string;
  openCount: number;
  webhookInboundBridged24h: number;
  providerImplementationStatus: string;
  connectionStatusCode: string | null;
  inboxWebhook: boolean;
  inboxHistorySync: boolean;
  lastSyncAt: string | null;
  lastSyncMessage: string | null;
  lastSyncImplementationStatus: "ready" | "pending" | null;
  dmInboxGateLabel?: string | null;
};

export type SocialHubInboxSyncSummary = {
  generatedAt: string;
  channels: SocialHubInboxChannelSyncRow[];
};

export type SocialHubInboxThreadPreview = {
  threadId: string;
  platformCode: string;
  platformLabel: string;
  displayLabel: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isOpen: boolean;
  messagingDeepLink: string;
};
