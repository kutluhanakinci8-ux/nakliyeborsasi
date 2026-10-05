import {
  messagingAttachmentLocalMaxBytes,
  messagingAttachmentS3MaxBytes,
  resolveMessagingAttachmentS3Config,
} from "./messagingAttachmentStorageConfig";

export type MessagingAttachmentOpsSnapshot = {
  localMaxBytesPerFile: number;
  s3MaxBytesPerFile: number;
  s3BucketConfigured: boolean;
  s3Bucket: string | null;
  s3Region: string | null;
  envKeysHint: string[];
};

export function buildMessagingAttachmentOpsSnapshot(): MessagingAttachmentOpsSnapshot {
  const s3 = resolveMessagingAttachmentS3Config();
  return {
    localMaxBytesPerFile: messagingAttachmentLocalMaxBytes(),
    s3MaxBytesPerFile: messagingAttachmentS3MaxBytes(),
    s3BucketConfigured: Boolean(s3),
    s3Bucket: s3?.bucket ?? null,
    s3Region: s3?.region ?? null,
    envKeysHint: [
      "MESSAGING_ATTACHMENT_S3_BUCKET",
      "MESSAGING_ATTACHMENT_S3_REGION",
      "MESSAGING_ATTACHMENT_S3_ENDPOINT",
      "MESSAGING_ATTACHMENT_S3_FORCE_PATH_STYLE",
      "MESSAGING_ATTACHMENT_S3_MAX_BYTES",
      "MESSAGING_ATTACHMENT_COMPANY_MONTHLY_QUOTA_BYTES",
    ],
  };
}
