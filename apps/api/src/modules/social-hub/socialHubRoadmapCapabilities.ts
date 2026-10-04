import type { SocialHubProviderCapabilities } from "./socialHubProviderCapabilities";
import { getTikTokProdCodePathCapabilities } from "./socialHubTikTokProdProvider";
import { getXProdCodePathCapabilities } from "./socialHubXProdProvider";
import { getYouTubeProdCodePathCapabilities } from "./socialHubYouTubeProdProvider";

export function getRoadmapProviderCapabilities(
  platformCode: string,
): SocialHubProviderCapabilities {
  const code = platformCode.trim().toUpperCase();
  if (code === "TIKTOK") {
    return getTikTokProdCodePathCapabilities();
  }
  if (code === "YOUTUBE") {
    return getYouTubeProdCodePathCapabilities();
  }
  if (code === "X") {
    return getXProdCodePathCapabilities();
  }
  return {
    oauthConnect: false,
    inboxWebhook: false,
    inboxHistorySync: false,
    outboundMessaging: false,
    feedPublish: false,
  };
}
