export const SOCIAL_HUB_MEDIA_REF_PREFIX = "social-hub-media:";

export function buildSocialHubMediaRef(mediaId: string): string {
  return `${SOCIAL_HUB_MEDIA_REF_PREFIX}${mediaId}`;
}

export function parseSocialHubMediaRef(
  value: string,
): { mediaId: string } | null {
  if (!value.startsWith(SOCIAL_HUB_MEDIA_REF_PREFIX)) {
    return null;
  }
  const mediaId = value.slice(SOCIAL_HUB_MEDIA_REF_PREFIX.length).trim();
  if (!mediaId || mediaId.includes("/") || mediaId.includes("..")) {
    return null;
  }
  return { mediaId };
}
