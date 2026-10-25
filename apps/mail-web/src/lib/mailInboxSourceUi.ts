import type { MailConnectedInboxSource } from "./mailApi";

export function connectedTabLabel(
  source: MailConnectedInboxSource,
  t: (key: string) => string,
): string {
  switch (source) {
    case "all":
      return t("capTabAll");
    case "lerta":
      return t("capTabLerta");
    case "microsoft_graph":
      return t("capTabMicrosoft");
    case "gmail_api":
      return t("capTabGmail");
    default:
      return source;
  }
}

export function inboxSourceBadgeClass(provider: string): string {
  if (provider === "gmail_api") {
    return "mail-inbox-source-badge mail-inbox-source-badge--gmail";
  }
  if (provider === "microsoft_graph") {
    return "mail-inbox-source-badge mail-inbox-source-badge--microsoft";
  }
  return "mail-inbox-source-badge mail-inbox-source-badge--lerta";
}

export function inboxSourceBadgeLabel(
  provider: string,
  fallbackLabel: string,
  t: (key: string) => string,
): string {
  if (provider === "gmail_api") {
    return t("capBadgeGmail");
  }
  if (provider === "microsoft_graph") {
    return t("capBadgeMicrosoft");
  }
  if (provider === "lerta") {
    return t("capBadgeLerta");
  }
  return fallbackLabel;
}
