import type { MailInboxListItem } from "@/lib/mailApi";
import { isFocusedInboxMessage } from "@/lib/mailInboxFocus";

const VIP_LOCAL_PART_HINTS = [
  "ceo",
  "genel",
  "mudur",
  "director",
  "owner",
  "sahip",
];

function parseReceivedAtMs(message: MailInboxListItem): number {
  const t = new Date(message.receivedAt).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Gmail tarzı önem skoru: yüksek = listede üstte. */
export function inboxSmartSortScore(message: MailInboxListItem): number {
  let score = 0;
  if (message.starredAt) {
    score += 120;
  }
  if (!message.readAt) {
    score += 80;
  }
  if (isFocusedInboxMessage(message)) {
    score += 40;
  }
  if ((message.attachmentCount ?? 0) > 0) {
    score += 8;
  }
  const from = message.fromAddress.toLowerCase();
  const at = from.indexOf("@");
  const local = at > 0 ? from.slice(0, at) : from;
  if (VIP_LOCAL_PART_HINTS.some((hint) => local.includes(hint))) {
    score += 25;
  }
  if (from.includes("noreply") || from.includes("no-reply")) {
    score -= 35;
  }
  const ageHours =
    (Date.now() - parseReceivedAtMs(message)) / (60 * 60 * 1000);
  if (ageHours < 2) {
    score += 15;
  } else if (ageHours < 24) {
    score += 6;
  } else if (ageHours > 24 * 14) {
    score -= 10;
  }
  return score;
}

export function sortInboxMessagesSmart(
  messages: MailInboxListItem[],
): MailInboxListItem[] {
  return [...messages].sort((a, b) => {
    const scoreDelta = inboxSmartSortScore(b) - inboxSmartSortScore(a);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return parseReceivedAtMs(b) - parseReceivedAtMs(a);
  });
}
