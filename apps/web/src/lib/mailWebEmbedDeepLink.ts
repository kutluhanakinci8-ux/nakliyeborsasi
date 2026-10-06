/** mail-web `mailView` query — MailClientView alt kümesi + embed handoff */
export type MailWebEmbedView =
  | "inbox"
  | "sent"
  | "archive"
  | "spam"
  | "trash"
  | "starred"
  | "drafts";

export type MailWebEmbedHandoff = {
  mailView?: MailWebEmbedView;
  customFolder?: string;
  openCompose?: boolean;
  composeTo?: string;
};

export function parseMailWebEmbedView(
  raw: string | null | undefined,
): MailWebEmbedView | null {
  const v = raw?.trim().toLowerCase();
  if (!v) {
    return null;
  }
  const allowed: MailWebEmbedView[] = [
    "inbox",
    "sent",
    "archive",
    "spam",
    "trash",
    "starred",
    "drafts",
  ];
  return allowed.includes(v as MailWebEmbedView)
    ? (v as MailWebEmbedView)
    : null;
}
