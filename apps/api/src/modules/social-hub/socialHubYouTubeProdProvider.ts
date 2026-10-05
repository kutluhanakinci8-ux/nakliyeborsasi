import type { SocialHubProviderCapabilities } from "./socialHubProviderCapabilities";

export const YOUTUBE_PROD_PLATFORM_CODE = "YOUTUBE";

export function isYouTubeProdProviderPlatform(platformCode: string): boolean {
  return platformCode.trim().toUpperCase() === YOUTUBE_PROD_PLATFORM_CODE;
}

/** Kod yolunda desteklenen yetenekler (Pub/Sub webhook + deploy bayrakları runtime’da). */
export function getYouTubeProdCodePathCapabilities(): SocialHubProviderCapabilities {
  return {
    oauthConnect: true,
    inboxWebhook: true,
    inboxHistorySync: false,
    outboundMessaging: true,
    feedPublish: false,
  };
}

export function isYouTubeWebhookBridgeDeployEnabled(): boolean {
  return process.env.SOCIAL_YOUTUBE_WEBHOOK_BRIDGE_ENABLED?.trim() !== "0";
}

export function isYouTubeOutboundDeployEnabled(): boolean {
  return process.env.SOCIAL_YOUTUBE_OUTBOUND_ENABLED?.trim() === "1";
}
