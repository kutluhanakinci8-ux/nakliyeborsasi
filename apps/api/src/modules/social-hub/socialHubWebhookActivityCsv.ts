import type { SocialHubWebhookBridgePlatformStat } from "./socialHubWebhookBridgeSnapshot";

export function buildCompanyWebhookActivityCsv(params: {
  generatedAt: string;
  inboundBridged24h: number;
  lastInboundBridgedAt: string | null;
  byPlatform: SocialHubWebhookBridgePlatformStat[];
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
  push("summary", "inboundBridged24h", params.inboundBridged24h);
  push("summary", "lastInboundBridgedAt", params.lastInboundBridgedAt ?? "");
  for (const row of params.byPlatform) {
    push("platform24h", row.platformCode, row.inboundBridged24h);
  }
  return lines.join("\n");
}
