import { SOCIAL_HUB_ROADMAP_PROVIDERS } from "./socialHubRoadmapProviders";
import { labelSocialPlatform } from "./socialHubPlatformLabels";

const LABEL_BY_CODE = new Map(
  SOCIAL_HUB_ROADMAP_PROVIDERS.map((row) => [row.platformCode, row.label]),
);

export function formatRoadmapInterestLabels(platformCodes: string[]): string[] {
  return platformCodes.map(
    (code) => LABEL_BY_CODE.get(code) ?? labelSocialPlatform(code),
  );
}

export function buildRoadmapInterestDigestSection(
  platformCodes: string[],
): string {
  if (platformCodes.length === 0) {
    return "";
  }
  const labels = formatRoadmapInterestLabels(platformCodes);
  return `*Yol haritası önceliği:* ${labels.join(", ")}`;
}

export function buildRoadmapInterestEmailClause(platformCodes: string[]): string {
  if (platformCodes.length === 0) {
    return "";
  }
  const labels = formatRoadmapInterestLabels(platformCodes);
  return `Yol haritası önceliği: ${labels.join(", ")}.`;
}
