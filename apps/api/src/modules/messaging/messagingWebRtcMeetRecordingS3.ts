import { MessagingAttachmentS3Store } from "./MessagingAttachmentS3Store";
import {
  MESSAGING_ATTACHMENT_S3_SCHEME,
  messagingAttachmentS3MaxBytes,
  resolveMessagingAttachmentS3Config,
} from "./messagingAttachmentStorageConfig";

export function meetRecordingS3Enabled(): boolean {
  return resolveMessagingAttachmentS3Config() !== null;
}

export function meetRecordingMaxBytes(): number {
  const raw = process.env.MESSAGING_WEBRTC_MEET_RECORDING_MAX_BYTES?.trim();
  const redisCap = raw ? Number.parseInt(raw, 10) : 2_500_000;
  const safeRedis =
    Number.isFinite(redisCap) && redisCap > 0 ? redisCap : 2_500_000;
  if (meetRecordingS3Enabled()) {
    const s3Cap = Number.parseInt(
      process.env.MESSAGING_WEBRTC_MEET_RECORDING_S3_MAX_BYTES?.trim() ??
        String(messagingAttachmentS3MaxBytes()),
      10,
    );
    return Number.isFinite(s3Cap) && s3Cap > safeRedis ? s3Cap : safeRedis;
  }
  return safeRedis;
}

export function buildMeetRecordingS3Key(
  threadId: string,
  archiveId: string,
  filename: string,
): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `messaging/webrtc/meet-recordings/${threadId}/${archiveId}/${safeName}`;
}

export function meetRecordingS3StoragePath(bucket: string, key: string): string {
  return `${MESSAGING_ATTACHMENT_S3_SCHEME}${bucket}/${key}`;
}

export function parseMeetRecordingS3Path(
  storagePath: string,
): { bucket: string; key: string } | null {
  if (!storagePath.startsWith(MESSAGING_ATTACHMENT_S3_SCHEME)) {
    return null;
  }
  const rest = storagePath.slice(MESSAGING_ATTACHMENT_S3_SCHEME.length);
  const slash = rest.indexOf("/");
  if (slash < 1) {
    return null;
  }
  return { bucket: rest.slice(0, slash), key: rest.slice(slash + 1) };
}

export async function putMeetRecordingS3(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const config = resolveMessagingAttachmentS3Config();
  if (!config) {
    throw new Error("S3 not configured");
  }
  const store = new MessagingAttachmentS3Store(config);
  await store.putObject({ key, body, contentType });
  return meetRecordingS3StoragePath(config.bucket, key);
}

export async function getMeetRecordingS3(storagePath: string): Promise<Buffer> {
  const parsed = parseMeetRecordingS3Path(storagePath);
  const config = resolveMessagingAttachmentS3Config();
  if (!parsed || !config || parsed.bucket !== config.bucket) {
    throw new Error("invalid s3 path");
  }
  const store = new MessagingAttachmentS3Store(config);
  return await store.getObject(parsed.key);
}
