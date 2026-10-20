export function normalizeMailCampaignClientReference(
  raw?: string | null,
): string | undefined {
  const value = raw?.trim();
  if (!value) {
    return undefined;
  }
  const normalized = value.slice(0, 64);
  return normalized.length > 0 ? normalized : undefined;
}
