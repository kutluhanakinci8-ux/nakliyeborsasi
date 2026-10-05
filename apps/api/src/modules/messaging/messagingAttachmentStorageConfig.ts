export type MessagingAttachmentS3Config = {
  bucket: string;
  region: string;
  endpoint: string | null;
  forcePathStyle: boolean;
};

const DEFAULT_LOCAL_MAX_BYTES = 10_000_000;
const DEFAULT_S3_MAX_BYTES = 52_428_800; // 50 MiB
const DEFAULT_COMPANY_MONTHLY_QUOTA_BYTES = 536_870_912; // 512 MiB

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function messagingAttachmentLocalMaxBytes(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return parsePositiveInt(env.MESSAGING_ATTACHMENT_LOCAL_MAX_BYTES, DEFAULT_LOCAL_MAX_BYTES);
}

export function messagingAttachmentS3MaxBytes(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return parsePositiveInt(env.MESSAGING_ATTACHMENT_S3_MAX_BYTES, DEFAULT_S3_MAX_BYTES);
}

export function messagingAttachmentMaxBytesPublic(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const s3 = resolveMessagingAttachmentS3Config(env);
  return s3
    ? messagingAttachmentS3MaxBytes(env)
    : messagingAttachmentLocalMaxBytes(env);
}

export function resolveMessagingAttachmentS3Config(
  env: NodeJS.ProcessEnv = process.env,
): MessagingAttachmentS3Config | null {
  const bucket = env.MESSAGING_ATTACHMENT_S3_BUCKET?.trim();
  if (!bucket) {
    return null;
  }
  const region =
    env.MESSAGING_ATTACHMENT_S3_REGION?.trim() ??
    env.AWS_REGION?.trim() ??
    env.AWS_DEFAULT_REGION?.trim() ??
    "eu-central-1";
  const endpoint = env.MESSAGING_ATTACHMENT_S3_ENDPOINT?.trim() ?? null;
  const forcePathStyle = env.MESSAGING_ATTACHMENT_S3_FORCE_PATH_STYLE === "1";
  return { bucket, region, endpoint, forcePathStyle };
}

export function messagingAttachmentCompanyMonthlyQuotaBytes(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return parsePositiveInt(
    env.MESSAGING_ATTACHMENT_COMPANY_MONTHLY_QUOTA_BYTES,
    DEFAULT_COMPANY_MONTHLY_QUOTA_BYTES,
  );
}

export const MESSAGING_ATTACHMENT_S3_SCHEME = "s3://";
