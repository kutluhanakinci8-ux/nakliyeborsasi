import type { InboxSnapshotPayload } from "./mailOfflineTypes";
import { compressJsonToZstdBase64, decompressZstdBase64ToJson } from "./mailZstd";
import type { MailInboxMessageDetail } from "./mailApi";

export const OFFLINE_PAYLOAD_CODEC = "zstd-base64-v1" as const;

export async function encodeOfflineSnapshot(
  payload: InboxSnapshotPayload,
): Promise<{ codec: typeof OFFLINE_PAYLOAD_CODEC; blob: string }> {
  const blob = await compressJsonToZstdBase64(payload);
  return { codec: OFFLINE_PAYLOAD_CODEC, blob };
}

export function decodeOfflineSnapshot(blob: string): InboxSnapshotPayload {
  return decompressZstdBase64ToJson<InboxSnapshotPayload>(blob);
}

export async function encodeOfflineMessageDetail(
  message: MailInboxMessageDetail,
  cachedAt: number,
): Promise<{
  codec: typeof OFFLINE_PAYLOAD_CODEC;
  blob: string;
  id: string;
  cachedAt: number;
}> {
  const blob = await compressJsonToZstdBase64({ message, cachedAt });
  return {
    codec: OFFLINE_PAYLOAD_CODEC,
    blob,
    id: message.id,
    cachedAt,
  };
}

export function decodeOfflineMessageDetail(blob: string): {
  message: MailInboxMessageDetail;
  cachedAt: number;
} {
  return decompressZstdBase64ToJson(blob);
}
