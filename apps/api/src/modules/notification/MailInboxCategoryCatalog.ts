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

export function inboxCategoryFromClassifyLabel(
  label: string,
): MailInboxCategory | null {
  const normalized = label.trim().toLowerCase().replace(/[^a-z_]/g, "");
  switch (normalized) {
    case "promo":
    case "promotions":
    case "spam_suspect":
      return "promotions";
    case "billing":
    case "support":
      return "updates";
    case "commercial":
      return "commercial";
    case "social":
      return "social";
    case "forums":
    case "newsletter":
      return "forums";
    case "general":
    default:
      return null;
  }
}

export function isCategorizedInboxCategory(
  category: MailInboxCategory | null | undefined,
): boolean {
  return category != null;
}
