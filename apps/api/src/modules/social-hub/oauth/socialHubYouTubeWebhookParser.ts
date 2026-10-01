export type ParsedYouTubeInboundMessage = {
  channelId: string;
  externalThreadId: string;
  displayLabel: string;
  bodyText: string;
  externalMessageId: string | null;
};

/** Google Pub/Sub push: decode message.data (base64 JSON) into the payload root. */
export function expandYouTubePubSubWebhookBody(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const envelope = body.message;
  if (!envelope || typeof envelope !== "object") {
    return body;
  }
  const data = (envelope as Record<string, unknown>).data;
  if (typeof data !== "string" || !data.trim()) {
    return body;
  }
  try {
    const decoded = Buffer.from(data, "base64").toString("utf8");
    const inner = JSON.parse(decoded) as Record<string, unknown>;
    return { ...body, ...inner };
  } catch {
    return body;
  }
}

export function parseYouTubeWebhookInbound(
  body: Record<string, unknown>,
): ParsedYouTubeInboundMessage | null {
  const expanded = expandYouTubePubSubWebhookBody(body);
  const content =
    expanded.content && typeof expanded.content === "object"
      ? (expanded.content as Record<string, unknown>)
      : expanded;
  const channelId = pickChannelId(content);
  const senderId = pickString(content, [
    "authorChannelId",
    "from_user_id",
    "sender_id",
    "user_id",
  ]);
  const conversationId = pickString(content, [
    "conversation_id",
    "conversationId",
    "thread_id",
    "parentId",
  ]);
  const bodyText = pickString(content, ["text", "message", "body"]);
  const snippetText =
    content.snippet && typeof content.snippet === "object"
      ? pickString(content.snippet as Record<string, unknown>, [
          "displayMessage",
          "textDisplay",
          "description",
        ])
      : null;
  const text = bodyText ?? snippetText;
  if (!channelId || !text?.trim()) {
    return null;
  }
  const threadKey = conversationId ?? senderId ?? "unknown";
  const messageId = pickString(content, [
    "message_id",
    "id",
    "messageId",
  ]);
  return {
    channelId,
    externalThreadId: threadKey,
    displayLabel: senderId
      ? `YouTube ${senderId.slice(0, 8)}`
      : "YouTube kullanıcı",
    bodyText: text.trim(),
    externalMessageId: messageId,
  };
}

function pickChannelId(source: Record<string, unknown>): string | null {
  const resourceId = source.resourceId;
  if (resourceId && typeof resourceId === "object") {
    const nested = pickString(resourceId as Record<string, unknown>, [
      "channelId",
      "channel_id",
    ]);
    if (nested) {
      return nested;
    }
  }
  return pickString(source, ["channelId", "channel_id", "to_channel_id"]);
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
