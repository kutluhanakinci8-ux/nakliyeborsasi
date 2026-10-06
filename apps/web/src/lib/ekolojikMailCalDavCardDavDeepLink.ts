import { EKOLOJIK_HUB_PATH } from "./ekolojikSocialMessagingDeepLink";
import {
  parseMailWebEmbedView,
  type MailWebEmbedHandoff,
} from "./mailWebEmbedDeepLink";

export type EkolojikMailDavSettingsTab = "calendarSettings" | "contactsSettings";

export function readEkolojikMailDavFromSearchParams(
  searchParams: URLSearchParams,
): Pick<MailWebEmbedHandoff, "mailView" | "mailSettingsTab"> {
  const mailSettings =
    searchParams.get("mailSettings")?.trim() ??
    searchParams.get("mail_settings")?.trim();
  const mailView = parseMailWebEmbedView(searchParams.get("mailView"));
  const tab = mailSettings as EkolojikMailDavSettingsTab | undefined;
  const mailSettingsTab =
    tab === "calendarSettings" || tab === "contactsSettings"
      ? tab
      : mailSettings || undefined;
  return {
    mailView: mailView ?? undefined,
    mailSettingsTab,
  };
}

export function ekolojikMailCalDavHubHref(): string {
  const params = new URLSearchParams({
    bolum: "posta",
    mailView: "calendar",
    mailSettings: "calendarSettings",
  });
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function ekolojikMailCardDavHubHref(): string {
  const params = new URLSearchParams({
    bolum: "posta",
    mailView: "contacts",
    mailSettings: "contactsSettings",
  });
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function isEkolojikMailCalDavHub(
  bolum: string | null,
  mailSettings: string | null,
  mailView: string | null,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  return (
    mailSettings === "calendarSettings" || mailView?.toLowerCase() === "calendar"
  );
}

export function isEkolojikMailCardDavHub(
  bolum: string | null,
  mailSettings: string | null,
  mailView: string | null,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  return (
    mailSettings === "contactsSettings" ||
    mailView?.toLowerCase() === "contacts"
  );
}
