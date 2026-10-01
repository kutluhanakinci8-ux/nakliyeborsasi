import { SOCIAL_HUB_ROADMAP_PROVIDERS } from "./socialHubRoadmapProviders";
import { labelSocialPlatform } from "./socialHubPlatformLabels";

const LABEL_BY_CODE = new Map(
  SOCIAL_HUB_ROADMAP_PROVIDERS.map((row) => [row.platformCode, row.label]),
);

export function formatRoadmapInterestLabels(platformCodes: string[]): string[] {
  return platformCodes.map(
    (code) => LABEL_BY_CODE.get(code) ?? labelSocialPlatform(code),
  );
}

export function buildRoadmapInterestDigestSection(
  platformCodes: string[],
): string {
  if (platformCodes.length === 0) {
    return "";
  }
  const labels = formatRoadmapInterestLabels(platformCodes);
  return `*Yol haritası önceliği:* ${labels.join(", ")}`;
}

export function buildRoadmapInterestEmailClause(platformCodes: string[]): string {
  if (platformCodes.length === 0) {
    return "";
  }
  const labels = formatRoadmapInterestLabels(platformCodes);
  return `Yol haritası önceliği: ${labels.join(", ")}.`;
}

export function buildRoadmapBetaOpsDigestSection(
  roadmapChannels: Array<{
    platformCode: string;
    label: string;
    statusCode: string;
    openThreadCount: number;
    recentOutboundFailures24h: number;
  }>,
): string {
  const connected = roadmapChannels.filter(
    (channel) => channel.statusCode === "CONNECTED",
  );
  if (connected.length === 0) {
    return "";
  }
  const lines = connected.map(
    (channel) =>
      `• ${channel.label} (beta): ${channel.openThreadCount} açık · ${channel.recentOutboundFailures24h} giden hata (24s)`,
  );
  return `*Beta kanallar*\n${lines.join("\n")}`;
}

export function buildWebhookBridgeDigestSection(inboundBridged24h: number): string {
  if (inboundBridged24h <= 0) {
    return "";
  }
  return `*Webhook köprü (24s):* ${inboundBridged24h} gelen mesaj Mesajlar’a aktarıldı (denetim kaydı).`;
}

export function buildRoadmapBetaOpsEmailClause(
  roadmapChannels: Array<{
    label: string;
    statusCode: string;
    openThreadCount: number;
    recentOutboundFailures24h: number;
  }>,
): string {
  const connected = roadmapChannels.filter(
    (channel) => channel.statusCode === "CONNECTED",
  );
  if (connected.length === 0) {
    return "";
  }
  const parts = connected.map(
    (channel) =>
      `${channel.label}: ${channel.openThreadCount} açık konuşma, ${channel.recentOutboundFailures24h} hatalı giden (24s)`,
  );
  return `Beta kanallar — ${parts.join("; ")}.`;
}
