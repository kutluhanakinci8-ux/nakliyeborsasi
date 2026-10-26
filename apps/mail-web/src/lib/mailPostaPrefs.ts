import type {
  MailInboxPreferences,
  UndoSendSeconds,
} from "./mailApi";

const FOCUSED_INBOX_ENABLED_KEY = "lerta-mail-focused-inbox-enabled";

export function readStoredFocusedInboxEnabled(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const raw = localStorage.getItem(FOCUSED_INBOX_ENABLED_KEY);
    if (raw === "0") {
      return false;
    }
    if (raw === "1") {
      return true;
    }
  } catch {
    /* ignore */
  }
  return true;
}

export function writeStoredFocusedInboxEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(FOCUSED_INBOX_ENABLED_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export const DEFAULT_MAIL_POSTA_PREFERENCES: Pick<
  MailInboxPreferences,
  | "undoSendSeconds"
  | "defaultReplyMode"
  | "remoteImagesPolicy"
  | "afterMessageAction"
  | "confirmPermanentDelete"
  | "confirmBulkDelete"
  | "threadViewEnabled"
  | "swipePrimaryAction"
  | "focusedInboxEnabled"
  | "inboxSmartSortEnabled"
  | "replyQuoteMode"
> = {
  undoSendSeconds: 5,
  defaultReplyMode: "reply",
  remoteImagesPolicy: "show",
  afterMessageAction: "list",
  confirmPermanentDelete: true,
  confirmBulkDelete: true,
  threadViewEnabled: false,
  swipePrimaryAction: "archive",
  focusedInboxEnabled: true,
  inboxSmartSortEnabled: true,
  replyQuoteMode: "full",
};

export function pickMailPostaPreferences(
  prefs: Partial<MailInboxPreferences> | null | undefined,
  options?: { beforeServerPrefs?: boolean },
): typeof DEFAULT_MAIL_POSTA_PREFERENCES {
  const focusedDefault =
    options?.beforeServerPrefs && prefs?.focusedInboxEnabled === undefined
      ? readStoredFocusedInboxEnabled()
      : true;
  return {
    undoSendSeconds: normalizeUndoSendSeconds(prefs?.undoSendSeconds),
    defaultReplyMode:
      prefs?.defaultReplyMode === "reply_all" ? "reply_all" : "reply",
    remoteImagesPolicy:
      prefs?.remoteImagesPolicy === "ask" || prefs?.remoteImagesPolicy === "hide"
        ? prefs.remoteImagesPolicy
        : "show",
    afterMessageAction:
      prefs?.afterMessageAction === "next" ||
      prefs?.afterMessageAction === "previous"
        ? prefs.afterMessageAction
        : "list",
    confirmPermanentDelete: prefs?.confirmPermanentDelete ?? true,
    confirmBulkDelete: prefs?.confirmBulkDelete ?? true,
    threadViewEnabled: prefs?.threadViewEnabled ?? false,
    swipePrimaryAction:
      prefs?.swipePrimaryAction === "delete" ||
      prefs?.swipePrimaryAction === "read"
        ? prefs.swipePrimaryAction
        : "archive",
    focusedInboxEnabled: prefs?.focusedInboxEnabled ?? focusedDefault,
    inboxSmartSortEnabled: prefs?.inboxSmartSortEnabled ?? true,
    replyQuoteMode:
      prefs?.replyQuoteMode === "trimmed" || prefs?.replyQuoteMode === "none"
        ? prefs.replyQuoteMode
        : "full",
  };
}

export function normalizeUndoSendSeconds(
  value: number | undefined,
): UndoSendSeconds {
  const options: UndoSendSeconds[] = [0, 5, 10, 20, 30];
  if (value !== undefined && options.includes(value as UndoSendSeconds)) {
    return value as UndoSendSeconds;
  }
  return 5;
}

/** API gecikmeli gönder: 0 = anında, >0 = geri al süresi */
export function composeDelaySecondsFromUndoPref(
  undoSendSeconds: UndoSendSeconds,
): number | undefined {
  return undoSendSeconds > 0 ? undoSendSeconds : undefined;
}
