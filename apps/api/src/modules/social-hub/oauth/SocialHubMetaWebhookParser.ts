export type SocialMetaMessagingChannel = "instagram" | "messenger";

export type ParsedInboundSocialMessage = {
  entryId: string;
  externalThreadId: string;
  displayLabel: string;
  bodyText: string;
  externalMessageId: string | null;
  channel: SocialMetaMessagingChannel;
};

export function parseMetaWebhookBody(body: Record<string, unknown>): {
  object: string | undefined;
  messages: ParsedInboundSocialMessage[];
} {
  const object = typeof body.object === "string" ? body.object : undefined;
  const messages: ParsedInboundSocialMessage[] = [];
  const entries = Array.isArray(body.entry) ? body.entry : [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const entryRecord = entry as Record<string, unknown>;
    const entryId =
      typeof entryRecord.id === "string" ? entryRecord.id : undefined;
    if (!entryId) {
      continue;
    }
    const messaging = Array.isArray(entryRecord.messaging)
      ? entryRecord.messaging
      : [];
    for (const item of messaging) {
      const parsed = parseMessagingEvent(entryId, item);
      if (parsed) {
        messages.push(parsed);
      }
    }
    const changes = Array.isArray(entryRecord.changes) ? entryRecord.changes : [];
    for (const change of changes) {
      const parsed =
        parseWhatsAppChange(entryId, change) ??
        parseInstagramMessagingChange(entryId, change);
      if (parsed) {
        messages.push(parsed);
      }
    }
  }
  return { object, messages };
}

function parseMessagingEvent(
  entryId: string,
  raw: unknown,
): ParsedInboundSocialMessage | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const event = raw as Record<string, unknown>;
  const message = event.message as Record<string, unknown> | undefined;
  if (!message || message.is_echo === true) {
    return null;
  }
  const sender = event.sender as Record<string, unknown> | undefined;
  const senderId =
    typeof sender?.id === "string" ? sender.id : "unknown-sender";
  const text =
    typeof message.text === "string"
      ? message.text
      : typeof message.sticker_id === "string"
        ? "[sticker]"
        : "";
  if (!text.trim()) {
    return null;
  }
  const mid =
    typeof message.mid === "string" ? message.mid : null;
  const messagingProduct =
    typeof event.messaging_product === "string"
      ? event.messaging_product
      : undefined;
  const channel: SocialMetaMessagingChannel =
    messagingProduct === "instagram" ? "instagram" : "messenger";
  return {
    entryId,
    externalThreadId: senderId,
    displayLabel: senderId,
    bodyText: text.trim(),
    externalMessageId: mid,
    channel,
  };
}

function parseInstagramMessagingChange(
  entryId: string,
  raw: unknown,
): ParsedInboundSocialMessage | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const change = raw as Record<string, unknown>;
  if (change.field !== "messages") {
    return null;
  }
  const value = change.value as Record<string, unknown> | undefined;
  if (!value || typeof value !== "object") {
    return null;
  }
  const nestedMessage = value.message as Record<string, unknown> | undefined;
  if (nestedMessage?.is_echo === true) {
    return null;
  }
  const sender = value.sender as Record<string, unknown> | undefined;
  const senderId =
    typeof sender?.id === "string"
      ? sender.id
      : typeof value.from === "string"
        ? value.from
        : null;
  const text =
    typeof nestedMessage?.text === "string"
      ? nestedMessage.text
      : typeof (value.message as Record<string, unknown> | undefined)?.text ===
          "string"
        ? (value.message as { text: string }).text
        : typeof value.text === "string"
          ? value.text
          : "";
  if (!senderId || !text.trim()) {
    return null;
  }
  const mid =
    typeof nestedMessage?.mid === "string"
      ? nestedMessage.mid
      : typeof value.mid === "string"
        ? value.mid
        : null;
  const username =
    typeof sender?.username === "string" ? sender.username : null;
  return {
    entryId,
    externalThreadId: senderId,
    displayLabel: username ? `@${username}` : senderId,
    bodyText: text.trim(),
    externalMessageId: mid,
    channel: "instagram",
  };
}

function parseWhatsAppChange(
  entryId: string,
  raw: unknown,
): ParsedInboundSocialMessage | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const change = raw as Record<string, unknown>;
  if (change.field !== "messages") {
    return null;
  }
  const value = change.value as Record<string, unknown> | undefined;
  const waMessages = Array.isArray(value?.messages) ? value.messages : [];
  for (const wa of waMessages) {
    if (!wa || typeof wa !== "object") {
      continue;
    }
    const msg = wa as Record<string, unknown>;
    const from = typeof msg.from === "string" ? msg.from : null;
    const textBody = (msg.text as Record<string, unknown> | undefined)?.body;
    const body = typeof textBody === "string" ? textBody : "";
    if (!from || !body.trim()) {
      continue;
    }
    const id = typeof msg.id === "string" ? msg.id : null;
    return {
      entryId,
      externalThreadId: from,
      displayLabel: from,
      bodyText: body.trim(),
      externalMessageId: id,
      channel: "messenger",
    };
  }
  return null;
}
