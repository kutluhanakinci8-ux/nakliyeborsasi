import { SocialPlatformCode, ValidationException } from "@nakliyeborsasi/core";

const ALLOWED_SCOPES = new Set<string>([
  ...Object.values(SocialPlatformCode),
  "TIKTOK",
  "YOUTUBE",
]);

export function normalizeSocialHubTemplateChannelScope(
  channelScopeCode: string | null | undefined,
): string | null {
  const trimmed = channelScopeCode?.trim();
  if (!trimmed) {
    return null;
  }
  if (!ALLOWED_SCOPES.has(trimmed)) {
    throw new ValidationException(
      "Geçersiz kanal kapsamı; boş bırakın (tüm kanallar) veya desteklenen bir kanal seçin.",
    );
  }
  return trimmed;
}
