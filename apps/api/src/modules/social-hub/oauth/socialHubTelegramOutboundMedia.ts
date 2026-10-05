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

export function buildTelegramSendMediaGroupForm(params: {
  chatId: string;
  caption: string;
  items: TelegramOutboundMediaItem[];
  replyToMessageId?: number | null;
}): FormData {
  const mediaPayload = params.items.map((item, index) => {
    const entry: Record<string, string> = {
      type: item.type,
      media: `attach://${item.attachName}`,
    };
    if (index === 0 && params.caption) {
      entry.caption = params.caption;
    }
    return entry;
  });
  const form = new FormData();
  form.append("chat_id", params.chatId);
  form.append("media", JSON.stringify(mediaPayload));
  if (params.replyToMessageId) {
    form.append("reply_to_message_id", String(params.replyToMessageId));
  }
  for (const item of params.items) {
    const blob = new Blob([Uint8Array.from(item.buffer)], {
      type: item.contentType,
    });
    form.append(item.attachName, blob, item.filename);
  }
  return form;
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
