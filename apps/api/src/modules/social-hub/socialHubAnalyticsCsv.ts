import type { SocialHubWebhookBridgePlatformStat } from "./socialHubWebhookBridgeSnapshot";

export function buildSocialHubAnalyticsCsv(params: {
  generatedAt: string;
  connectedChannels: number;
  openInboxThreads: number;
  publishedLast30Days: number;
  webhookInboundBridged24h: number;
  webhookInboundBridged7d: number;
  webhookByPlatform24h: SocialHubWebhookBridgePlatformStat[];
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
  for (const row of params.webhookByPlatform24h) {
    push("webhookPlatform24h", row.platformCode, row.inboundBridged24h);
  }
  return lines.join("\n");
}
