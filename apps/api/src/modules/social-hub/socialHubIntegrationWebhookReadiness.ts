export type SocialHubBetaWebhookReadiness = {
  webhookBridgeEnabled: boolean;
  outboundEnabled: boolean;
  signatureOrPushAuthConfigured: boolean;
  signatureOrPushAuthRequired: boolean;
};

export type SocialHubIntegrationWebhookReadiness = {
  tiktok: SocialHubBetaWebhookReadiness;
  youtube: SocialHubBetaWebhookReadiness;
};

function isTruthyEnv(name: string): boolean {
  return process.env[name]?.trim() === "1";
}

function isBridgeEnabled(disableFlag: string): boolean {
  return process.env[disableFlag]?.trim() !== "0";
}

export function buildSocialHubIntegrationWebhookReadiness(): SocialHubIntegrationWebhookReadiness {
  const tiktokSecretConfigured = Boolean(
    process.env.SOCIAL_TIKTOK_WEBHOOK_SECRET?.trim() ||
      process.env.SOCIAL_TIKTOK_OAUTH_CLIENT_SECRET?.trim(),
  );
  const youtubeTokenConfigured = Boolean(
    process.env.SOCIAL_YOUTUBE_WEBHOOK_CHANNEL_TOKEN?.trim(),
  );
  return {
    tiktok: {
      webhookBridgeEnabled: isBridgeEnabled("SOCIAL_TIKTOK_WEBHOOK_BRIDGE_ENABLED"),
      outboundEnabled: isTruthyEnv("SOCIAL_TIKTOK_OUTBOUND_ENABLED"),
      signatureOrPushAuthConfigured: tiktokSecretConfigured,
      signatureOrPushAuthRequired: isTruthyEnv(
        "SOCIAL_TIKTOK_WEBHOOK_SIGNATURE_REQUIRED",
      ),
    },
    youtube: {
      webhookBridgeEnabled: isBridgeEnabled("SOCIAL_YOUTUBE_WEBHOOK_BRIDGE_ENABLED"),
      outboundEnabled: isTruthyEnv("SOCIAL_YOUTUBE_OUTBOUND_ENABLED"),
      signatureOrPushAuthConfigured: youtubeTokenConfigured,
      signatureOrPushAuthRequired: isTruthyEnv(
        "SOCIAL_YOUTUBE_WEBHOOK_PUSH_AUTH_REQUIRED",
      ),
    },
  };
}
