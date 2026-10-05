import type { TelegramUser } from "./socialHubTelegramApi";

export type TelegramInboundMessage = {
  externalThreadId: string;
  displayLabel: string;
  bodyText: string;
  externalMessageId: string;
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

export function parseTelegramInboundMessage(
  update: Record<string, unknown>,
): TelegramInboundMessage | null {
  const message = update.message;
  if (!message || typeof message !== "object") {
    return null;
  }
  const msg = message as Record<string, unknown>;
  const text = msg.text;
  if (typeof text !== "string" || !text.trim()) {
    return null;
  }
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
  return {
    externalThreadId: String(chatId),
    displayLabel: labelFromUser(fromUser),
    bodyText: text.trim(),
    externalMessageId: String(messageId),
  };
}
