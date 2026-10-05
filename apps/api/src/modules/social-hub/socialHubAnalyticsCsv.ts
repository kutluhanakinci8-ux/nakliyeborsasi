import type { SocialHubWebhookBridgePlatformStat } from "./socialHubWebhookBridgeSnapshot";
import type { SocialHubPlatformInsightRow } from "./SocialHubMetaPlatformInsightsService";

export function buildSocialHubAnalyticsCsv(params: {
  generatedAt: string;
  connectedChannels: number;
  openInboxThreads: number;
  publishedLast30Days: number;
  webhookInboundBridged24h: number;
  webhookInboundBridged7d: number;
  webhookInboundBridged30d: number;
  webhookByPlatform24h: SocialHubWebhookBridgePlatformStat[];
  webhookByPlatform7d: SocialHubWebhookBridgePlatformStat[];
  platformInsights: SocialHubPlatformInsightRow[];
  utmCampaignPublishedLast30Days: Array<{
    utmCampaign: string;
    count: number;
  }>;
}): string {
  const header = "section,key,value";
  const lines: string[] = [header];
  const push = (section: string, key: string, value: string | number) => {
    const text = String(value).replace(/"/g, '""');
    const needsQuote =
      text.includes(",") || text.includes("\n") || text.includes('"');
    lines.push(
      `${section},${key},${needsQuote ? `"${text}"` : text}`,
    );
  };
  push("meta", "generatedAt", params.generatedAt);
  push("channels", "connected", params.connectedChannels);
  push("inbox", "openThreads", params.openInboxThreads);
  push("posts", "publishedLast30Days", params.publishedLast30Days);
  push("webhook", "inboundBridged24h", params.webhookInboundBridged24h);
  push("webhook", "inboundBridged7d", params.webhookInboundBridged7d);
  push("webhook", "inboundBridged30d", params.webhookInboundBridged30d);
  for (const row of params.webhookByPlatform24h) {
    push("webhookPlatform24h", row.platformCode, row.inboundBridged24h);
  }
  for (const row of params.webhookByPlatform7d) {
    push("webhookPlatform7d", row.platformCode, row.inboundBridged24h);
  }
  for (const row of params.utmCampaignPublishedLast30Days) {
    push("utmCampaign30d", row.utmCampaign, row.count);
  }
  for (const row of params.platformInsights) {
    push("metaPlatformInsight", `${row.platformCode}.status`, row.status);
    if (row.followersCount != null) {
      push("metaPlatformInsight", `${row.platformCode}.followers`, row.followersCount);
    }
    if (row.impressions28d != null) {
      push(
        "metaPlatformInsight",
        `${row.platformCode}.impressions28d`,
        row.impressions28d,
      );
    }
    if (row.engagedUsers28d != null) {
      push(
        "metaPlatformInsight",
        `${row.platformCode}.engagedOrReach28d`,
        row.engagedUsers28d,
      );
    }
  }
  return lines.join("\n");
}
