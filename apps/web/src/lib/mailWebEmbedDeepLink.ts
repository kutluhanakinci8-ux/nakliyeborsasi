/** mail-web `mailView` query — MailClientView alt kümesi + embed handoff */
export type MailWebEmbedView =
  | "inbox"
  | "sent"
  | "all"
  | "archive"
  | "spam"
  | "trash"
  | "starred"
  | "snoozed"
  | "drafts"
  | "calendar"
  | "contacts";

export type MailWebEmbedHandoff = {
  mailView?: MailWebEmbedView;
  customFolder?: string;
  openCompose?: boolean;
  composeTo?: string;
  /** Zengin HTML yazım (mail-web ComposeRichEditor). */
  composeRich?: boolean;
  /** Şablon kimliği (`builtin:yuk-teklifi` veya slug). */
  composeTemplateId?: string;
  /** Cc/Bcc + ekler (multipart MIME yazım ekranı). */
  composeMultipart?: boolean;
  /** Webmail ayarlar paneli (`accounts`, `deliverability`, …). */
  mailSettingsTab?: string;
  /** Gelen kutusu toplu seçim / işlem şeridi (EK-P5). */
  mailBulkAssist?: boolean;
  /** Liste kaydırma (swipe) arşiv/çöp ipucu (EK-P5). */
  mailSwipeAssist?: boolean;
  /** Teslimat ayarlarında DMARC aggregate vurgusu (EK-P7). */
  mailDmarcAssist?: boolean;
  /** Bildirimler + PWA / offline / push odak (EK-P8). */
  mailPwaAssist?: boolean;
  /** Yeni mesajda AI gövde önerisi (EK-P9, opsiyonel). */
  composeAiAssist?: boolean;
  /** Teslimat panelinde engagement + webhook analitik (EK-P10). */
  mailEngagementAssist?: boolean;
  /** Ops snapshot + runbook paneli (EK-P11). */
  mailOpsAssist?: boolean;
  /** Tek mesaj deep link (`mail-web` ?message=). */
  messageId?: string;
  /** Ekolojik/NB hub: iframe içinde webmail sol menüyü gizle. */
  embedHubShell?: boolean;
  /** Ürün kabuğu markası (`ekolojik` → yeşil tema + başlık). */
  productShell?: "ekolojik";
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
    "all",
    "archive",
    "spam",
    "trash",
    "starred",
    "snoozed",
    "drafts",
    "calendar",
    "contacts",
  ];
  return allowed.includes(v as MailWebEmbedView)
    ? (v as MailWebEmbedView)
    : null;
}
