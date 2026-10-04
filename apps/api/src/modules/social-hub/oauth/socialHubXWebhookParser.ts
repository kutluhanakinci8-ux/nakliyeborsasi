export type ParsedXDirectMessageInbound = {
  forUserId: string;
  externalMessageId: string;
  externalThreadId: string;
  displayLabel: string;
  bodyText: string;
};

function readUserName(
  users: Record<string, { username?: string; name?: string }> | undefined,
  userId: string,
): string {
  const row = users?.[userId];
  if (row?.username) {
    return `@${row.username}`;
  }
  if (row?.name) {
    return row.name;
  }
  return `X ${userId}`;
}

export function parseXAccountActivityDmInbound(
  body: Record<string, unknown>,
): ParsedXDirectMessageInbound | null {
  const forUserId =
    typeof body.for_user_id === "string" ? body.for_user_id.trim() : "";
  if (!forUserId) {
    return null;
  }
  const events = body.direct_message_events;
  if (!Array.isArray(events) || events.length === 0) {
    return null;
  }
  const users = body.users as
    | Record<string, { username?: string; name?: string }>
    | undefined;
  const last = events[events.length - 1] as Record<string, unknown>;
  const messageCreate = last.message_create as Record<string, unknown> | undefined;
  if (!messageCreate) {
    return null;
  }
  const senderId =
    typeof messageCreate.sender_id === "string"
      ? messageCreate.sender_id.trim()
      : "";
  const messageData = messageCreate.message_data as
    | { text?: string }
    | undefined;
  const text = messageData?.text?.trim() ?? "";
  if (!senderId || !text) {
    return null;
  }
  if (senderId === forUserId) {
    return null;
  }
  const eventId = typeof last.id === "string" ? last.id : `dm-${Date.now()}`;
  return {
    forUserId,
    externalMessageId: eventId,
    externalThreadId: senderId,
    displayLabel: readUserName(users, senderId),
    bodyText: text,
  };
}
