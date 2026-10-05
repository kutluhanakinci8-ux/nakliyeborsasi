import type { TelegramParsedMedia } from "./socialHubTelegramWebhookParser";

export type TelegramMediaGroupBufferState = {
  connectionId: string;
  companyId: string;
  mediaGroupId: string;
  externalThreadId: string;
  displayLabel: string;
  bodyText: string;
  media: TelegramParsedMedia[];
  externalMessageIds: string[];
};

export function mergeTelegramMediaGroupPart(
  existing: TelegramMediaGroupBufferState | null,
  part: {
    connectionId: string;
    companyId: string;
    mediaGroupId: string;
    externalThreadId: string;
    displayLabel: string;
    bodyText: string;
    media: TelegramParsedMedia[];
    externalMessageId: string;
  },
): TelegramMediaGroupBufferState {
  const mediaById = new Map<string, TelegramParsedMedia>();
  for (const item of existing?.media ?? []) {
    mediaById.set(item.fileId, item);
  }
  for (const item of part.media) {
    mediaById.set(item.fileId, item);
  }
  const messageIds = new Set(existing?.externalMessageIds ?? []);
  messageIds.add(part.externalMessageId);

  const pickBody = (a: string, b: string): string => {
    const placeholders = new Set([
      "[fotoğraf]",
      "[video]",
      "[belge]",
      "[ses]",
      "[ses dosyası]",
      "[gif]",
      "[sticker]",
      "[medya]",
    ]);
    const aOk = a.trim() && !placeholders.has(a.trim());
    const bOk = b.trim() && !placeholders.has(b.trim());
    if (aOk && bOk) {
      return a.length >= b.length ? a : b;
    }
    if (aOk) {
      return a;
    }
    if (bOk) {
      return b;
    }
    return a.trim() || b.trim() || "[medya]";
  };

  return {
    connectionId: part.connectionId,
    companyId: part.companyId,
    mediaGroupId: part.mediaGroupId,
    externalThreadId: part.externalThreadId,
    displayLabel: part.displayLabel,
    bodyText: pickBody(existing?.bodyText ?? "", part.bodyText),
    media: [...mediaById.values()].slice(0, 5),
    externalMessageIds: [...messageIds],
  };
}
