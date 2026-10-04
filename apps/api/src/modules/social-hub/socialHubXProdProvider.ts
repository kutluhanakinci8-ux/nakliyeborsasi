import type { SocialHubProviderCapabilities } from "./socialHubProviderCapabilities";

export const X_PROD_PLATFORM_CODE = "X";

export function isXProdProviderPlatform(platformCode: string): boolean {
  return platformCode.trim().toUpperCase() === X_PROD_PLATFORM_CODE;
}

/** Kod yolunda desteklenen yetenekler (DM / webhook sonraki faz). */
export function getXProdCodePathCapabilities(): SocialHubProviderCapabilities {
  return {
    oauthConnect: true,
    inboxWebhook: false,
    inboxHistorySync: false,
    outboundMessaging: false,
    feedPublish: false,
  };
}
