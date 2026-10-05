import type { SocialHubProviderCapabilities } from "./socialHubProviderCapabilities";

export const TIKTOK_PROD_PLATFORM_CODE = "TIKTOK";

export function isTikTokProdProviderPlatform(platformCode: string): boolean {
  return platformCode.trim().toUpperCase() === TIKTOK_PROD_PLATFORM_CODE;
}

/** Kod yolunda desteklenen yetenekler (deploy bayrakları runtime’da ayrı). */
export function getTikTokProdCodePathCapabilities(): SocialHubProviderCapabilities {
  return {
    oauthConnect: true,
    inboxWebhook: true,
    inboxHistorySync: false,
    outboundMessaging: true,
    feedPublish: false,
  };
}

export function isTikTokWebhookBridgeDeployEnabled(): boolean {
  return process.env.SOCIAL_TIKTOK_WEBHOOK_BRIDGE_ENABLED?.trim() !== "0";
}

export function isTikTokOutboundDeployEnabled(): boolean {
  return process.env.SOCIAL_TIKTOK_OUTBOUND_ENABLED?.trim() === "1";
}
