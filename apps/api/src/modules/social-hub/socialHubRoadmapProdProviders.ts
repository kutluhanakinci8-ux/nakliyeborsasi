import { isTikTokProdProviderPlatform } from "./socialHubTikTokProdProvider";
import { isXProdProviderPlatform } from "./socialHubXProdProvider";
import { isYouTubeProdProviderPlatform } from "./socialHubYouTubeProdProvider";

export function isRoadmapProdProviderPlatform(platformCode: string): boolean {
  return (
    isTikTokProdProviderPlatform(platformCode) ||
    isYouTubeProdProviderPlatform(platformCode) ||
    isXProdProviderPlatform(platformCode)
  );
}
