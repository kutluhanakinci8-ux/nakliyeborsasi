import { isTikTokProdProviderPlatform } from "./socialHubTikTokProdProvider";
import { isYouTubeProdProviderPlatform } from "./socialHubYouTubeProdProvider";

export function isRoadmapProdProviderPlatform(platformCode: string): boolean {
  return (
    isTikTokProdProviderPlatform(platformCode) ||
    isYouTubeProdProviderPlatform(platformCode)
  );
}
