import { SocialPlatformCode } from "@nakliyeborsasi/core";

export type SocialHubProviderCapabilities = {
  oauthConnect: boolean;
  inboxWebhook: boolean;
  inboxHistorySync: boolean;
  outboundMessaging: boolean;
  feedPublish: boolean;
};

const CAPABILITIES: Record<SocialPlatformCode, SocialHubProviderCapabilities> = {
  [SocialPlatformCode.Instagram]: {
    oauthConnect: true,
    inboxWebhook: true,
    inboxHistorySync: true,
    outboundMessaging: true,
    feedPublish: true,
  },
  [SocialPlatformCode.FacebookMessenger]: {
    oauthConnect: true,
    inboxWebhook: true,
    inboxHistorySync: true,
    outboundMessaging: true,
    feedPublish: true,
  },
  [SocialPlatformCode.WhatsAppCloud]: {
    oauthConnect: true,
    inboxWebhook: true,
    inboxHistorySync: false,
    outboundMessaging: true,
    feedPublish: false,
  },
  [SocialPlatformCode.LinkedIn]: {
    oauthConnect: true,
    inboxWebhook: false,
    inboxHistorySync: false,
    outboundMessaging: false,
    feedPublish: true,
  },
  [SocialPlatformCode.Telegram]: {
    oauthConnect: true,
    inboxWebhook: true,
    inboxHistorySync: false,
    outboundMessaging: true,
    feedPublish: true,
  },
};

export function getSocialHubProviderCapabilities(
  platformCode: SocialPlatformCode,
): SocialHubProviderCapabilities {
  return CAPABILITIES[platformCode];
}
