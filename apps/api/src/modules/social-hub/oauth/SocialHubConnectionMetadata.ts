export type SocialHubConnectionMetadata = {
  pageId?: string;
  phoneNumberId?: string;
  wabaId?: string;
  instagramBusinessAccountId?: string;
};

export function parseSocialHubConnectionMetadata(
  grantedScopes: string | null | undefined,
): SocialHubConnectionMetadata {
  if (!grantedScopes?.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(grantedScopes) as SocialHubConnectionMetadata;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

export function serializeSocialHubConnectionMetadata(
  metadata: SocialHubConnectionMetadata,
): string {
  return JSON.stringify(metadata);
}
