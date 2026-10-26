import sharp from "sharp";

const PREVIEWABLE_IMAGE = /^image\/(jpeg|jpg|png|gif|webp|bmp|tiff)$/i;

export function isPreviewableMailAttachmentContentType(
  contentType: string,
): boolean {
  return PREVIEWABLE_IMAGE.test(contentType.trim());
}

/** Posta ekleri — küçük JPEG önizleme (libvips/sharp, libjpeg-turbo vb.). */
export async function createMailAttachmentImagePreview(
  buffer: Buffer,
  maxWidth = 320,
): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
