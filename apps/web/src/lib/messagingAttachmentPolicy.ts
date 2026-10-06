/** NB/Ekolojik hub — yerel depolama (S3 kapalı) ile aynı sunucu limitleri. */
export const MESSAGING_ATTACHMENT_MAX_COUNT = 5;

export const MESSAGING_ATTACHMENT_MAX_BYTES = 10_000_000;

export function messagingAttachmentLimitSummary(): string {
  return `En fazla ${MESSAGING_ATTACHMENT_MAX_COUNT} dosya · dosya başına 10 MB (yerel depolama)`;
}

export function messagingAttachmentAttachTitle(): string {
  return `Dosya ekle (${MESSAGING_ATTACHMENT_MAX_COUNT}×10 MB)`;
}
