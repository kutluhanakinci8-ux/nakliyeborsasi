import { SocialPlatformCode } from "@nakliyeborsasi/core";

export const SOCIAL_HUB_PLATFORM_LABELS: Record<SocialPlatformCode, string> = {
  [SocialPlatformCode.Instagram]: "Instagram",
  [SocialPlatformCode.FacebookMessenger]: "Facebook Messenger",
  [SocialPlatformCode.WhatsAppCloud]: "WhatsApp Business",
  [SocialPlatformCode.LinkedIn]: "LinkedIn",
};

export function labelSocialPlatform(code: string): string {
  return (
    SOCIAL_HUB_PLATFORM_LABELS[code as SocialPlatformCode] ?? code
  );
}
