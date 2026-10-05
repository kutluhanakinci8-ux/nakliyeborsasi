import type { SocialHubProviderCapabilities } from "./socialHubProviderCapabilities";

export const X_PROD_PLATFORM_CODE = "X";

export function isXProdProviderPlatform(platformCode: string): boolean {
  return platformCode.trim().toUpperCase() === X_PROD_PLATFORM_CODE;
}

export function isXPublishDeployEnabled(): boolean {
  return process.env.SOCIAL_X_PUBLISH_ENABLED?.trim() === "1";
}

export function isXOutboundDeployEnabled(): boolean {
  return process.env.SOCIAL_X_OUTBOUND_ENABLED?.trim() === "1";
}

export function isXWebhookBridgeDeployEnabled(): boolean {
  return process.env.SOCIAL_X_WEBHOOK_BRIDGE_ENABLED?.trim() !== "0";
}

/** Kod yolunda desteklenen yetenekler (deploy bayrakları runtime’da ayrı). */
export function getXProdCodePathCapabilities(): SocialHubProviderCapabilities {
  return {
    oauthConnect: true,
    inboxWebhook: isXWebhookBridgeDeployEnabled(),
    inboxHistorySync: false,
    outboundMessaging: isXOutboundDeployEnabled(),
    feedPublish: isXPublishDeployEnabled(),
  };
}
