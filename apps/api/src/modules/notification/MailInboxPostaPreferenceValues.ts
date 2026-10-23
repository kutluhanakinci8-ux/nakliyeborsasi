export const UNDO_SEND_SECONDS_OPTIONS = [0, 5, 10, 20, 30] as const;
export type UndoSendSeconds = (typeof UNDO_SEND_SECONDS_OPTIONS)[number];

export type MailDefaultReplyMode = "reply" | "reply_all";
export type MailRemoteImagesPolicy = "show" | "ask" | "hide";
export type MailAfterMessageAction = "list" | "next" | "previous";
export type MailSwipePrimaryAction = "archive" | "delete" | "read";
export type MailReplyQuoteMode = "full" | "trimmed" | "none";

export function normalizeUndoSendSeconds(value: number | undefined): UndoSendSeconds {
  if (value === undefined || value === null) {
    return 5;
  }
  const n = Math.floor(value);
  if ((UNDO_SEND_SECONDS_OPTIONS as readonly number[]).includes(n)) {
    return n as UndoSendSeconds;
  }
  return 5;
}

export function normalizeDefaultReplyMode(
  value: string | undefined,
): MailDefaultReplyMode {
  return value === "reply_all" ? "reply_all" : "reply";
}

export function normalizeRemoteImagesPolicy(
  value: string | undefined,
): MailRemoteImagesPolicy {
  if (value === "ask" || value === "hide") {
    return value;
  }
  return "show";
}

export function normalizeAfterMessageAction(
  value: string | undefined,
): MailAfterMessageAction {
  if (value === "next" || value === "previous") {
    return value;
  }
  return "list";
}

export function normalizeSwipePrimaryAction(
  value: string | undefined,
): MailSwipePrimaryAction {
  if (value === "delete" || value === "read") {
    return value;
  }
  return "archive";
}

export function normalizeReplyQuoteMode(
  value: string | undefined,
): MailReplyQuoteMode {
  if (value === "trimmed" || value === "none") {
    return value;
  }
  return "full";
}
