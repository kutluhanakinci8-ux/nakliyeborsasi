import type { MailInboxListItem } from "@/lib/mailApi";

export type InboxQueryFilterId =
  | "unread"
  | "flagged"
  | "pinned"
  | "categorized"
  | "toMe"
  | "hasAttachments"
  | "mentions"
  | "events";

export const INBOX_QUERY_FILTER_IDS: readonly InboxQueryFilterId[] = [
  "unread",
  "flagged",
  "pinned",
  "categorized",
  "toMe",
  "hasAttachments",
  "mentions",
  "events",
];

const EVENT_SUBJECT =
  /(toplantı|meeting|invite|invitation|calendar|etkinlik|davet|zoom|teams|webinar)/i;

const MENTION_PATTERN = /@\w/;

export function matchesInboxQueryFilter(
  message: MailInboxListItem,
  filter: InboxQueryFilterId,
  userMailboxEmail?: string | null,
): boolean {
  switch (filter) {
    case "unread":
      return !message.readAt;
    case "flagged":
      return Boolean(message.starredAt);
    case "pinned":
      return Boolean(message.starredAt);
    case "categorized":
      return Boolean(message.userInboxCategoryId);
    case "toMe": {
      if (!userMailboxEmail) {
        return !message.readAt;
      }
      const me = userMailboxEmail.toLowerCase();
      const subj = message.subject.toLowerCase();
      const snip = (message.snippet ?? "").toLowerCase();
      return subj.includes(me) || snip.includes(me) || !message.readAt;
    }
    case "hasAttachments":
      return (message.attachmentCount ?? 0) > 0;
    case "mentions":
      return (
        MENTION_PATTERN.test(message.subject) ||
        MENTION_PATTERN.test(message.snippet ?? "")
      );
    case "events":
      return EVENT_SUBJECT.test(message.subject);
    default:
      return true;
  }
}

/** Seçili filtrelerden herhangi biri eşleşirse satır listede kalır. */
export function applyInboxQueryFilters(
  messages: MailInboxListItem[],
  active: ReadonlySet<InboxQueryFilterId>,
  userMailboxEmail?: string | null,
): MailInboxListItem[] {
  if (active.size === 0) {
    return messages;
  }
  const selected = INBOX_QUERY_FILTER_IDS.filter((id) => active.has(id));
  return messages.filter((m) =>
    selected.some((id) => matchesInboxQueryFilter(m, id, userMailboxEmail)),
  );
}

/** Outlook tarzı: seçili kullanıcı kategorilerinden herhangi biri (boş set = filtre yok). */
export function applyUserInboxCategoryFilters(
  messages: MailInboxListItem[],
  activeCategoryIds: ReadonlySet<string>,
): MailInboxListItem[] {
  if (activeCategoryIds.size === 0) {
    return messages;
  }
  return messages.filter(
    (m) =>
      m.userInboxCategoryId != null &&
      activeCategoryIds.has(m.userInboxCategoryId),
  );
}
