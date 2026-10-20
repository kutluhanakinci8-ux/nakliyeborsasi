export function normalizeMailCampaignTags(
  tags?: string[] | null,
): string[] | undefined {
  if (!tags?.length) {
    return undefined;
  }
  const normalized = [
    ...new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0 && tag.length <= 32),
    ),
  ].slice(0, 8);
  return normalized.length > 0 ? normalized : undefined;
}
