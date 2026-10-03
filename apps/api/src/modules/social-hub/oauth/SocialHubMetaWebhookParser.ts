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
    const defaultChannel: SocialMetaMessagingChannel | undefined =
      object === "instagram" ? "instagram" : undefined;

    const messagingArrays = [
      entryRecord.messaging,
      entryRecord.standby,
    ];
    for (const rawArray of messagingArrays) {
      const messaging = Array.isArray(rawArray) ? rawArray : [];
      for (const item of messaging) {
        const parsed = parseMessagingEvent(entryId, item, defaultChannel);
        if (parsed) {
          messages.push(parsed);
        }
      }
    }

    if (
      typeof entryRecord.field === "string" &&
      entryRecord.value &&
      typeof entryRecord.value === "object"
    ) {
      const parsed =
        entryRecord.field === "messages"
          ? parseInstagramMessagingChange(entryId, {
              field: "messages",
              value: entryRecord.value,
            })
          : null;
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
  defaultChannel?: SocialMetaMessagingChannel,
): ParsedInboundSocialMessage | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const event = raw as Record<string, unknown>;
  const message = event.message as Record<string, unknown> | undefined;
  const postback = event.postback as Record<string, unknown> | undefined;

  if (message) {
    if (message.is_echo === true || message.is_deleted === true) {
      return null;
    }
    const bodyText = extractMetaMessageBody(message);
    if (!bodyText.trim()) {
      return null;
    }
    const sender = event.sender as Record<string, unknown> | undefined;
    const senderId =
      typeof sender?.id === "string" ? sender.id : "unknown-sender";
    const mid =
      typeof message.mid === "string" ? message.mid : null;
    const messagingProduct =
      typeof event.messaging_product === "string"
        ? event.messaging_product
        : undefined;
    const channel: SocialMetaMessagingChannel =
      messagingProduct === "instagram" || defaultChannel === "instagram"
        ? "instagram"
        : "messenger";
    return {
      entryId,
      externalThreadId: senderId,
      displayLabel: senderId,
      bodyText: bodyText.trim(),
      externalMessageId: mid,
      channel,
    };
  }

  if (postback && defaultChannel === "instagram") {
    const sender = event.sender as Record<string, unknown> | undefined;
    const senderId =
      typeof sender?.id === "string" ? sender.id : "unknown-sender";
    const title =
      typeof postback.title === "string" ? postback.title.trim() : "";
    const payload =
      typeof postback.payload === "string" ? postback.payload.trim() : "";
    const bodyText = title || payload;
    if (!bodyText) {
      return null;
    }
    const mid =
      typeof postback.mid === "string" ? postback.mid : null;
    return {
      entryId,
      externalThreadId: senderId,
      displayLabel: senderId,
      bodyText,
      externalMessageId: mid,
      channel: "instagram",
    };
  }

  return null;
}

function extractMetaMessageBody(message: Record<string, unknown>): string {
  const text =
    typeof message.text === "string" ? message.text.trim() : "";
  if (text) {
    return text;
  }
  const quickReply = message.quick_reply as Record<string, unknown> | undefined;
  const quickPayload =
    typeof quickReply?.payload === "string" ? quickReply.payload.trim() : "";
  if (quickPayload) {
    return quickPayload;
  }
  if (message.is_unsupported === true) {
    return "[desteklenmeyen medya]";
  }
  const attachments = Array.isArray(message.attachments)
    ? message.attachments
    : [];
  if (attachments.length > 0) {
    const labels: string[] = [];
    for (const raw of attachments) {
      if (!raw || typeof raw !== "object") {
        continue;
      }
      const att = raw as Record<string, unknown>;
      const type =
        typeof att.type === "string" ? att.type.trim() : "medya";
      labels.push(type);
    }
    if (labels.length > 0) {
      return `[${labels.join(", ")}]`;
    }
    return "[medya]";
  }
  if (typeof message.sticker_id === "string") {
    return "[sticker]";
  }
  return "";
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
  if (nestedMessage?.is_echo === true || nestedMessage?.is_deleted === true) {
    return null;
  }
  const sender = value.sender as Record<string, unknown> | undefined;
  const senderId =
    typeof sender?.id === "string"
      ? sender.id
      : typeof value.from === "string"
        ? value.from
        : null;
  const bodyText = nestedMessage
    ? extractMetaMessageBody(nestedMessage)
    : typeof value.text === "string"
      ? value.text.trim()
      : "";
  if (!senderId || !bodyText.trim()) {
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
    bodyText: bodyText.trim(),
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
