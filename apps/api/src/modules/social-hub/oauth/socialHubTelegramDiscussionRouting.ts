export type TelegramDiscussionRouting = {
  externalThreadId: string;
  displayLabel: string;
  isDiscussionComment: boolean;
};

export function extractDiscussionPostKey(
  message: Record<string, unknown>,
): string {
  const reply = message.reply_to_message;
  if (!reply || typeof reply !== "object") {
    return "general";
  }
  const replyRecord = reply as Record<string, unknown>;
  if (
    replyRecord.is_automatic_forward === true &&
    typeof replyRecord.message_id === "number"
  ) {
    return String(replyRecord.message_id);
  }
  if (typeof replyRecord.message_id === "number") {
    return String(replyRecord.message_id);
  }
  return "general";
}

export function buildDiscussionExternalThreadId(
  discussionGroupChatId: string,
  postKey: string,
): string {
  const group = discussionGroupChatId.trim();
  const post = postKey.trim() || "general";
  return `dg:${group}:post:${post}`;
}

export function parseDiscussionExternalThreadId(externalThreadId: string): {
  discussionGroupChatId: string;
  postMessageId: number | null;
} | null {
  const match = /^dg:(-?\d+):post:(\w+)$/.exec(externalThreadId.trim());
  if (!match) {
    return null;
  }
  const postRaw = match[2];
  const postMessageId =
    postRaw === "general" ? null : Number.parseInt(postRaw, 10);
  return {
    discussionGroupChatId: match[1],
    postMessageId: Number.isFinite(postMessageId) ? postMessageId : null,
  };
}

export function resolveTelegramDiscussionRouting(params: {
  chatId: string;
  discussionGroupChatId: string | null | undefined;
  senderDisplayLabel: string;
  message: Record<string, unknown>;
}): TelegramDiscussionRouting {
  const discussionId = params.discussionGroupChatId?.trim() ?? "";
  if (!discussionId || params.chatId !== discussionId) {
    return {
      externalThreadId: params.chatId,
      displayLabel: params.senderDisplayLabel,
      isDiscussionComment: false,
    };
  }
  const postKey = extractDiscussionPostKey(params.message);
  return {
    externalThreadId: buildDiscussionExternalThreadId(discussionId, postKey),
    displayLabel: `Kanal yorumu · ${params.senderDisplayLabel}`,
    isDiscussionComment: true,
  };
}
