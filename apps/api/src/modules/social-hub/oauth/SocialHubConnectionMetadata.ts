export type SocialHubConnectionMetadata = {
  pageId?: string;
  phoneNumberId?: string;
  wabaId?: string;
  instagramBusinessAccountId?: string;
  /** encryptTotpSecret ile şifrelenmiş LinkedIn refresh token */
  linkedInRefreshTokenCipher?: string;
  /** urn:li:organization:{id} — sayfa istatistikleri için */
  linkedInOrganizationUrn?: string;
  /** TikTok / YouTube (Google) yol haritası refresh token */
  roadmapRefreshTokenCipher?: string;
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
