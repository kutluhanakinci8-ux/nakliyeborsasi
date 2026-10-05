export type SocialHubConnectionMetadata = {
  pageId?: string;
  phoneNumberId?: string;
  wabaId?: string;
  instagramBusinessAccountId?: string;
  /** Instagram Business Login `user_id` / graph.instagram.com/me id (webhook entry.id) */
  instagramLoginUserId?: string;
  /** `instagram_login` = graph.instagram.com; `facebook_page` = Page + Messenger Platform */
  instagramAuthMode?: "instagram_login" | "facebook_page";
  /** encryptTotpSecret ile şifrelenmiş LinkedIn refresh token */
  linkedInRefreshTokenCipher?: string;
  /** urn:li:organization:{id} — sayfa istatistikleri için */
  linkedInOrganizationUrn?: string;
  /** TikTok / YouTube (Google) yol haritası refresh token */
  roadmapRefreshTokenCipher?: string;
  /** Telegram setWebhook secret_token doğrulaması */
  telegramWebhookSecret?: string;
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

export function usesInstagramLoginApi(
  metadata: SocialHubConnectionMetadata,
): boolean {
  return metadata.instagramAuthMode === "instagram_login";
}
