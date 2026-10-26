import { resolveApiBaseUrl } from "./apiConfig";

const IMAGE_ATTACHMENT = /^image\/(jpeg|jpg|png|gif|webp|bmp|tiff)$/i;

export function isMailImageAttachmentContentType(contentType: string): boolean {
  return IMAGE_ATTACHMENT.test(contentType.trim());
}

export function mailAttachmentPreviewRequestUrl(
  messageId: string,
  index: number,
): string {
  return `${resolveApiBaseUrl()}/company/mail-inbox/messages/${messageId}/attachments/${index}/preview`;
}

export async function fetchMailAttachmentPreviewBlob(
  accessToken: string,
  messageId: string,
  index: number,
): Promise<Blob> {
  const response = await fetch(
    mailAttachmentPreviewRequestUrl(messageId, index),
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new Error("Önizleme yüklenemedi");
  }
  return response.blob();
}
