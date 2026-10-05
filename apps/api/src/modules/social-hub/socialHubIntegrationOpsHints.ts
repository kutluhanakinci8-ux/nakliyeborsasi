import { buildMessagingAttachmentOpsSnapshot } from "../messaging/messagingAttachmentOpsSnapshot";

export type SocialHubIntegrationOpsHints = {
  webhookInboundDedupSeconds: number;
  webhookBridgeAuditEnabled: boolean;
  tiktokSignatureRequired: boolean;
  youtubePushAuthRequired: boolean;
  webhookInactivityHealthHintsEnabled: boolean;
  /** SOCIAL_HUB_WEBHOOK_DEFAULT_COMPANY_ID tanımlı mı (UUID döndürülmez) */
  defaultWebhookCompanyConfigured: boolean;
  messagingAttachmentLocalMaxBytes: number;
  messagingAttachmentS3MaxBytes: number;
  messagingAttachmentS3BucketConfigured: boolean;
};

export function buildSocialHubIntegrationOpsHints(): SocialHubIntegrationOpsHints {
  const attachmentOps = buildMessagingAttachmentOpsSnapshot();
  const dedupRaw = process.env.SOCIAL_HUB_WEBHOOK_INBOUND_DEDUP_SECONDS?.trim();
  const dedupParsed = dedupRaw ? Number.parseInt(dedupRaw, 10) : 0;
  return {
    webhookInboundDedupSeconds:
      dedupParsed > 0 ? dedupParsed : 0,
    webhookBridgeAuditEnabled:
      process.env.SOCIAL_HUB_WEBHOOK_BRIDGE_AUDIT?.trim() !== "0",
    tiktokSignatureRequired:
      process.env.SOCIAL_TIKTOK_WEBHOOK_SIGNATURE_REQUIRED?.trim() === "1",
    youtubePushAuthRequired:
      process.env.SOCIAL_YOUTUBE_WEBHOOK_PUSH_AUTH_REQUIRED?.trim() === "1",
    webhookInactivityHealthHintsEnabled:
      process.env.SOCIAL_HUB_WEBHOOK_INACTIVITY_HEALTH_HINT?.trim() === "1",
    defaultWebhookCompanyConfigured: Boolean(
      process.env.SOCIAL_HUB_WEBHOOK_DEFAULT_COMPANY_ID?.trim(),
    ),
    messagingAttachmentLocalMaxBytes: attachmentOps.localMaxBytesPerFile,
    messagingAttachmentS3MaxBytes: attachmentOps.s3MaxBytesPerFile,
    messagingAttachmentS3BucketConfigured: attachmentOps.s3BucketConfigured,
  };
}

export function isWebhookBridgeAuditEnabled(): boolean {
  return buildSocialHubIntegrationOpsHints().webhookBridgeAuditEnabled;
}
