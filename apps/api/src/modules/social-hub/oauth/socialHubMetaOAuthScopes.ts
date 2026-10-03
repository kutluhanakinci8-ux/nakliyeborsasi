import { SocialPlatformCode } from "@nakliyeborsasi/core";

/** Meta use-case uyumlu varsayılan scope setleri (Messenger / IG / WA ayrı). */
const META_OAUTH_SCOPES_DEFAULT: Record<SocialPlatformCode, string> = {
  [SocialPlatformCode.Instagram]:
    "business_management,pages_show_list,pages_read_engagement,pages_manage_metadata,instagram_basic,instagram_manage_messages,instagram_business_basic,instagram_business_manage_messages",
  [SocialPlatformCode.FacebookMessenger]:
    "business_management,pages_manage_metadata,pages_messaging,pages_show_list,pages_read_engagement",
  [SocialPlatformCode.WhatsAppCloud]:
    "public_profile,whatsapp_business_management,whatsapp_business_messaging,business_management",
  [SocialPlatformCode.LinkedIn]: "",
};

const META_OAUTH_SCOPES_ENV_KEY: Partial<Record<SocialPlatformCode, string>> = {
  [SocialPlatformCode.Instagram]: "SOCIAL_META_OAUTH_SCOPES_INSTAGRAM",
  [SocialPlatformCode.FacebookMessenger]:
    "SOCIAL_META_OAUTH_SCOPES_FACEBOOK_MESSENGER",
  [SocialPlatformCode.WhatsAppCloud]: "SOCIAL_META_OAUTH_SCOPES_WHATSAPP_CLOUD",
};

export function resolveMetaOAuthScopes(
  platformCode: SocialPlatformCode,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const envKey = META_OAUTH_SCOPES_ENV_KEY[platformCode];
  const fromEnv = envKey ? env[envKey]?.trim() : "";
  if (fromEnv) {
    return fromEnv;
  }
  return META_OAUTH_SCOPES_DEFAULT[platformCode] ?? "public_profile";
}
