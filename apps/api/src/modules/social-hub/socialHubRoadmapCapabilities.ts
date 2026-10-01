import type { SocialHubProviderCapabilities } from "./socialHubProviderCapabilities";
import { getTikTokProdCodePathCapabilities } from "./socialHubTikTokProdProvider";
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
  return {
    oauthConnect: false,
    inboxWebhook: false,
    inboxHistorySync: false,
    outboundMessaging: false,
    feedPublish: false,
  };
}
