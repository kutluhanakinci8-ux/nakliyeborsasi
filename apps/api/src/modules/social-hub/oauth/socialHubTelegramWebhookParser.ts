import type { TelegramUser } from "./socialHubTelegramApi";

export type TelegramMediaKind =
  | "photo"
  | "video"
  | "document"
  | "voice"
  | "audio"
  | "animation";

export type TelegramParsedMedia = {
  fileId: string;
  filename: string;
  contentType: string;
  kind: TelegramMediaKind;
};

export type TelegramInboundMessage = {
  externalThreadId: string;
  displayLabel: string;
  bodyText: string;
  externalMessageId: string;
  media: TelegramParsedMedia[];
};

function labelFromUser(user: TelegramUser): string {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  const name = parts.join(" ").trim();
  if (name) {
    return name;
  }
  if (user.username?.trim()) {
    return `@${user.username.trim()}`;
  }
  return `Kullanıcı ${user.id}`;
}

function largestPhotoFileId(photos: unknown): string | null {
  if (!Array.isArray(photos) || photos.length === 0) {
    return null;
  }
  const sorted = [...photos].sort(
    (a, b) =>
      ((b as { file_size?: number }).file_size ?? 0) -
      ((a as { file_size?: number }).file_size ?? 0),
  );
  const top = sorted[0] as { file_id?: string };
  return top.file_id?.trim() ?? null;
}

function readCaption(msg: Record<string, unknown>): string {
  const caption = msg.caption;
  return typeof caption === "string" ? caption.trim() : "";
}

function parseMediaFromMessage(
  msg: Record<string, unknown>,
): { bodyText: string; media: TelegramParsedMedia[] } {
  const media: TelegramParsedMedia[] = [];
  const caption = readCaption(msg);

  const photoId = largestPhotoFileId(msg.photo);
  if (photoId) {
    media.push({
      fileId: photoId,
      filename: "telegram-photo.jpg",
      contentType: "image/jpeg",
      kind: "photo",
    });
  }

  const video = msg.video;
  if (video && typeof video === "object") {
    const v = video as { file_id?: string; mime_type?: string; file_name?: string };
    if (v.file_id?.trim()) {
      media.push({
        fileId: v.file_id.trim(),
        filename: v.file_name?.trim() || "telegram-video.mp4",
        contentType: v.mime_type?.trim() || "video/mp4",
        kind: "video",
      });
    }
  }

  const animation = msg.animation;
  if (animation && typeof animation === "object") {
    const a = animation as { file_id?: string; mime_type?: string; file_name?: string };
    if (a.file_id?.trim()) {
      media.push({
        fileId: a.file_id.trim(),
        filename: a.file_name?.trim() || "telegram-animation.mp4",
        contentType: a.mime_type?.trim() || "video/mp4",
        kind: "animation",
      });
    }
  }

  const document = msg.document;
  if (document && typeof document === "object") {
    const d = document as {
      file_id?: string;
      mime_type?: string;
      file_name?: string;
    };
    if (d.file_id?.trim()) {
      media.push({
        fileId: d.file_id.trim(),
        filename: d.file_name?.trim() || "telegram-document",
        contentType: d.mime_type?.trim() || "application/octet-stream",
        kind: "document",
      });
    }
  }

  const voice = msg.voice;
  if (voice && typeof voice === "object") {
    const v = voice as { file_id?: string; mime_type?: string };
    if (v.file_id?.trim()) {
      media.push({
        fileId: v.file_id.trim(),
        filename: "telegram-voice.ogg",
        contentType: v.mime_type?.trim() || "audio/ogg",
        kind: "voice",
      });
    }
  }

  const audio = msg.audio;
  if (audio && typeof audio === "object") {
    const a = audio as {
      file_id?: string;
      mime_type?: string;
      file_name?: string;
    };
    if (a.file_id?.trim()) {
      media.push({
        fileId: a.file_id.trim(),
        filename: a.file_name?.trim() || "telegram-audio.mp3",
        contentType: a.mime_type?.trim() || "audio/mpeg",
        kind: "audio",
      });
    }
  }

  const text = typeof msg.text === "string" ? msg.text.trim() : "";
  let bodyText = text || caption;
  if (!bodyText && media.length > 0) {
    const labels: Record<TelegramMediaKind, string> = {
      photo: "[fotoğraf]",
      video: "[video]",
      document: "[belge]",
      voice: "[ses]",
      audio: "[ses dosyası]",
      animation: "[gif]",
    };
    bodyText = labels[media[0].kind] ?? "[medya]";
  }
  if (msg.sticker && media.length === 0 && !bodyText) {
    bodyText = "[sticker]";
  }

  return { bodyText, media };
}

function parseFromMessageRecord(
  msg: Record<string, unknown>,
): TelegramInboundMessage | null {
  const from = msg.from;
  if (!from || typeof from !== "object") {
    return null;
  }
  const fromUser = from as TelegramUser;
  if (fromUser.is_bot) {
    return null;
  }
  const chat = msg.chat;
  if (!chat || typeof chat !== "object") {
    return null;
  }
  const chatId = (chat as { id?: number }).id;
  if (chatId === undefined || chatId === null) {
    return null;
  }
  const messageId = msg.message_id;
  if (typeof messageId !== "number") {
    return null;
  }
  const { bodyText, media } = parseMediaFromMessage(msg);
  if (!bodyText.trim() && media.length === 0) {
    return null;
  }
  return {
    externalThreadId: String(chatId),
    displayLabel: labelFromUser(fromUser),
    bodyText: bodyText.trim() || "[medya]",
    externalMessageId: String(messageId),
    media,
  };
}

export function parseTelegramInboundMessage(
  update: Record<string, unknown>,
): TelegramInboundMessage | null {
  const message = update.message;
  if (message && typeof message === "object") {
    return parseFromMessageRecord(message as Record<string, unknown>);
  }
  return null;
}
