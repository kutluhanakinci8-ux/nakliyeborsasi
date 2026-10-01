import type { SocialHubProviderCapabilities } from "./socialHubProviderCapabilities";
import {
  getTikTokProdCodePathCapabilities,
  isTikTokProdProviderPlatform,
} from "./socialHubTikTokProdProvider";

function isTruthyEnv(name: string): boolean {
  return process.env[name]?.trim() === "1";
}

function isBridgeEnabled(disableFlag: string): boolean {
  return process.env[disableFlag]?.trim() !== "0";
}

export function getRoadmapProviderCapabilities(
  platformCode: string,
): SocialHubProviderCapabilities {
  const code = platformCode.trim().toUpperCase();
  if (isTikTokProdProviderPlatform(code)) {
    return getTikTokProdCodePathCapabilities();
  }
  if (code === "YOUTUBE") {
    return {
      oauthConnect: true,
      inboxWebhook: isBridgeEnabled("SOCIAL_YOUTUBE_WEBHOOK_BRIDGE_ENABLED"),
      inboxHistorySync: false,
      outboundMessaging: isTruthyEnv("SOCIAL_YOUTUBE_OUTBOUND_ENABLED"),
      feedPublish: false,
    };
  }
  return {
    oauthConnect: false,
    inboxWebhook: false,
    inboxHistorySync: false,
    outboundMessaging: false,
    feedPublish: false,
  };
}
