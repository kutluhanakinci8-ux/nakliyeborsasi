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
};

export type SocialHubInboxSyncSummary = {
  generatedAt: string;
  channels: SocialHubInboxChannelSyncRow[];
};
