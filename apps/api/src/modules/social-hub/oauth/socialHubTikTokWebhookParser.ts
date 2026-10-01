export type ParsedTikTokInboundMessage = {
  businessOpenId: string;
  externalThreadId: string;
  displayLabel: string;
  bodyText: string;
  externalMessageId: string | null;
};

export function parseTikTokWebhookInbound(
  body: Record<string, unknown>,
): ParsedTikTokInboundMessage | null {
  const content =
    body.content && typeof body.content === "object"
      ? (body.content as Record<string, unknown>)
      : body;
  const businessOpenId = pickString(content, [
    "to_user_id",
    "to_user_open_id",
    "receiver_open_id",
  ]);
  const senderId = pickString(content, [
    "from_user_id",
    "from_user_open_id",
    "sender_open_id",
  ]);
  const conversationId = pickString(content, [
    "conversation_id",
    "conversationId",
    "chat_id",
  ]);
  const bodyText = pickString(content, ["text", "message", "content_text"]);
  if (!businessOpenId || !bodyText?.trim()) {
    return null;
  }
  const threadKey = conversationId ?? senderId ?? "unknown";
  const messageId = pickString(content, ["message_id", "msg_id", "id"]);
  return {
    businessOpenId,
    externalThreadId: threadKey,
    displayLabel: senderId ? `TikTok ${senderId.slice(0, 8)}` : "TikTok kullanıcı",
    bodyText: bodyText.trim(),
    externalMessageId: messageId,
  };
}

function pickString(
  source: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
