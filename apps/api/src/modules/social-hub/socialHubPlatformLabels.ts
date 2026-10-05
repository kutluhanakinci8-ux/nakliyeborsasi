import { SocialPlatformCode } from "@nakliyeborsasi/core";

export const SOCIAL_HUB_PLATFORM_LABELS: Record<SocialPlatformCode, string> = {
  [SocialPlatformCode.Instagram]: "Instagram",
  [SocialPlatformCode.FacebookMessenger]: "Facebook Messenger",
  [SocialPlatformCode.WhatsAppCloud]: "WhatsApp Business",
  [SocialPlatformCode.LinkedIn]: "LinkedIn",
  [SocialPlatformCode.Telegram]: "Telegram",
};

const EXTRA_PLATFORM_LABELS: Record<string, string> = {
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  X: "X (Twitter)",
  GOOGLE_BUSINESS: "Google Business Profile",
};

export function labelSocialPlatform(code: string): string {
  return (
    SOCIAL_HUB_PLATFORM_LABELS[code as SocialPlatformCode] ??
    EXTRA_PLATFORM_LABELS[code] ??
    code
  );
}
