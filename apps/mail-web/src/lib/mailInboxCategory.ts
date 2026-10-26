import type { MailInboxListItem } from "@/lib/mailApi";

export const MAIL_INBOX_CATEGORY_VALUES = [
  "promotions",
  "updates",
  "social",
  "forums",
  "commercial",
] as const;

export type MailInboxCategory = (typeof MAIL_INBOX_CATEGORY_VALUES)[number];

export function normalizeInboxCategory(
  raw: string | null | undefined,
): MailInboxCategory | null {
  if (!raw) {
    return null;
  }
  const value = raw.trim().toLowerCase();
  return (MAIL_INBOX_CATEGORY_VALUES as readonly string[]).includes(value)
    ? (value as MailInboxCategory)
    : null;
}

export function isCategorizedInboxCategory(
  category: MailInboxCategory | null | undefined,
): boolean {
  return category != null;
}

const PROMO_PATTERN =
  /unsubscribe|newsletter|kampanya|promo|indirim|%\d|no-reply|noreply/i;
const UPDATE_PATTERN =
  /fatura|invoice|ödeme|payment|confirmation|onay|receipt|sipariş|kargo|teslimat|shipment/i;
const SOCIAL_PATTERN =
  /facebook|instagram|linkedin|twitter|x\.com|tiktok|youtube|sosyal/i;
const FORUM_PATTERN = /mailing list|liste|forum|digest|bulletin/i;
const COMMERCIAL_PATTERN = /teklif|offer|ihale|auction|nakliye|lojistik/i;

/** Bağlı hesap / henüz API sınıflandırması yapılmamış satırlar için yedek. */
export function inferInboxCategoryHeuristic(
  message: Pick<MailInboxListItem, "fromAddress" | "subject" | "snippet">,
): MailInboxCategory | null {
  const blob = `${message.fromAddress}\n${message.subject}\n${message.snippet ?? ""}`;
  if (PROMO_PATTERN.test(blob)) {
    return "promotions";
  }
  if (COMMERCIAL_PATTERN.test(blob)) {
    return "commercial";
  }
  if (UPDATE_PATTERN.test(blob)) {
    return "updates";
  }
  if (SOCIAL_PATTERN.test(blob)) {
    return "social";
  }
  if (FORUM_PATTERN.test(blob)) {
    return "forums";
  }
  return null;
}

export function resolveMessageInboxCategory(
  message: MailInboxListItem,
): MailInboxCategory | null {
  const stored = normalizeInboxCategory(message.inboxCategory ?? null);
  if (stored) {
    return stored;
  }
  return inferInboxCategoryHeuristic(message);
}

export function inboxCategoryLabelKey(
  category: MailInboxCategory,
): string {
  const map: Record<MailInboxCategory, string> = {
    promotions: "inboxCategoryPromotions",
    updates: "inboxCategoryUpdates",
    social: "inboxCategorySocial",
    forums: "inboxCategoryForums",
    commercial: "inboxCategoryCommercial",
  };
  return map[category];
}

export function inboxCategoryBadgeClass(category: MailInboxCategory): string {
  return `mail-inbox-category-badge mail-inbox-category-badge--${category}`;
}
