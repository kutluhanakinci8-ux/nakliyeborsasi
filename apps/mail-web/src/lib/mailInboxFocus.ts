import type { MailInboxListItem } from "@/lib/mailApi";

const BULK_FROM_PATTERNS = [
  "noreply",
  "no-reply",
  "newsletter",
  "bildirim",
  "notification",
  "marketing",
  "promo",
  "unsubscribe",
  "mailer-daemon",
];

/** Odaklı gelen kutusu: önemli satırlar (yıldız, okunmamış kişisel, vb.). */
export function isFocusedInboxMessage(message: MailInboxListItem): boolean {
  if (message.starredAt) {
    return true;
  }
  const from = message.fromAddress.toLowerCase();
  const subject = message.subject.toLowerCase();
  const looksBulk = BULK_FROM_PATTERNS.some(
    (p) => from.includes(p) || subject.includes(p),
  );
  if (looksBulk) {
    return false;
  }
  if (!message.readAt) {
    return true;
  }
  return false;
}

export type InboxFocusLane = "focus" | "other";

export function filterInboxByFocusLane(
  messages: MailInboxListItem[],
  lane: InboxFocusLane,
): MailInboxListItem[] {
  return messages.filter((m) =>
    lane === "focus" ? isFocusedInboxMessage(m) : !isFocusedInboxMessage(m),
  );
}
