export type HealthAlertChannelRow = {
  platformCode: string;
  label: string;
  tokenHealth: string;
  setupWarnings: string[];
  recentOutboundFailures24h: number;
  webhookInboundBridged24h?: number;
  inboxWebhookCapable?: boolean;
  statusCode?: string;
  isRoadmapBeta?: boolean;
};

export function mergeHealthAlertChannels(health: {
  channels: HealthAlertChannelRow[];
  roadmapChannels?: HealthAlertChannelRow[];
}): HealthAlertChannelRow[] {
  return [...health.channels, ...(health.roadmapChannels ?? [])];
}
