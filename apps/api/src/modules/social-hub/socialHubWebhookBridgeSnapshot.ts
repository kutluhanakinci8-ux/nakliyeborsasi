import { labelSocialPlatform } from "./socialHubPlatformLabels";

export type SocialHubWebhookBridgePlatformStat = {
  platformCode: string;
  label: string;
  inboundBridged24h: number;
};

export function mapWebhookBridgedByPlatform(
  rows: Array<{ platformCode: string; count: number }>,
): SocialHubWebhookBridgePlatformStat[] {
  return rows.map((row) => ({
    platformCode: row.platformCode,
    label: labelSocialPlatform(row.platformCode),
    inboundBridged24h: row.count,
  }));
}
