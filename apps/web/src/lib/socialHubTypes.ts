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

export type SocialHubSnapshot = {
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
