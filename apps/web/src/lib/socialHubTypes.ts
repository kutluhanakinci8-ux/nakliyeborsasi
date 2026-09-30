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
};

export type SocialHubProviderInfo = {
  platformCode: string;
  label: string;
  implementationStatus: "pending" | "ready";
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
