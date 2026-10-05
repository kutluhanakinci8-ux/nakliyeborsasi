export type TelegramOutboundMediaInput = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

export type TelegramOutboundMediaItem = {
  type: "photo" | "video" | "audio" | "document";
  attachName: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
};

const TELEGRAM_MEDIA_GROUP_MAX = 10;

export function telegramOutboundMediaGroupMax(): number {
  return TELEGRAM_MEDIA_GROUP_MAX;
}

export function mapTelegramOutboundMediaItems(
  attachments: TelegramOutboundMediaInput[],
): TelegramOutboundMediaItem[] {
  const slice = attachments.slice(0, TELEGRAM_MEDIA_GROUP_MAX);
  return slice.map((item, index) => {
    const contentType = item.contentType.toLowerCase();
    let type: TelegramOutboundMediaItem["type"] = "document";
    if (contentType.startsWith("image/")) {
      type = "photo";
    } else if (contentType.startsWith("video/")) {
      type = "video";
    } else if (
      contentType.startsWith("audio/") ||
      contentType === "audio/ogg"
    ) {
      type = "audio";
    }
    return {
      type,
      attachName: `file${index}`,
      filename: item.filename,
      contentType: item.contentType,
      buffer: item.buffer,
    };
  });
}
