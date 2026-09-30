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
};

export type SocialHubProviderCapabilities = {
  oauthConnect: boolean;
  inboxWebhook: boolean;
  inboxHistorySync: boolean;
  outboundMessaging: boolean;
  feedPublish: boolean;
};

export type SocialHubProviderInfo = {
  platformCode: string;
  label: string;
  implementationStatus: "pending" | "ready";
  capabilities?: SocialHubProviderCapabilities;
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
  oauthServerReady: boolean;
  canRefreshToken: boolean;
  linkedInRefreshAvailable?: boolean;
};

export type SocialHubHealth = {
  generatedAt: string;
  overallStatus: "healthy" | "attention" | "critical";
  channels: SocialHubHealthChannel[];
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
  createdAt: string;
};

export type SocialHubSnapshot = {
  subscription: SocialHubSubscriptionInfo;
  permissions: SocialHubPermissions;
  settings: SocialHubSettings;
  providers: SocialHubProviderInfo[];
  connections: SocialHubConnection[];
  recentPosts: SocialHubPost[];
  templates: SocialHubTemplate[];
  inboxSummary: {
    totalOpenThreads: number;
    byPlatform: Array<{
      platformCode: string;
      openCount: number;
      implementationStatus: string;
    }>;
    messagingDeepLink: string;
    note: string;
  };
};
