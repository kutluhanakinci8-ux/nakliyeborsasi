import { EKOLOJIK_HUB_PATH } from "./ekolojikSocialMessagingDeepLink";
import type { MailWebEmbedHandoff } from "./mailWebEmbedDeepLink";

export function readEkolojikMailInboxOpsFromSearchParams(
  searchParams: URLSearchParams,
): Pick<
  MailWebEmbedHandoff,
  "mailSettingsTab" | "mailBulkAssist" | "mailSwipeAssist"
> {
  const mailSettings =
    searchParams.get("mailSettings")?.trim() ??
    searchParams.get("mail_settings")?.trim();
  const bulkRaw = searchParams.get("mailBulk") ?? searchParams.get("bulk");
  const swipeRaw = searchParams.get("mailSwipe") ?? searchParams.get("swipe");
  const mailBulkAssist =
    bulkRaw === "1" || bulkRaw?.toLowerCase() === "true" ? true : undefined;
  const mailSwipeAssist =
    swipeRaw === "1" || swipeRaw?.toLowerCase() === "true" ? true : undefined;
  return {
    mailSettingsTab: mailSettings || undefined,
    mailBulkAssist,
    mailSwipeAssist,
  };
}

export function ekolojikMailRulesHubHref(): string {
  const params = new URLSearchParams({
    bolum: "posta",
    mailSettings: "rules",
  });
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function ekolojikMailBulkHubHref(): string {
  const params = new URLSearchParams({
    bolum: "posta",
    mailBulk: "1",
  });
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function ekolojikMailSwipeHubHref(): string {
  const params = new URLSearchParams({
    bolum: "posta",
    mailSwipe: "1",
  });
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function isEkolojikMailRulesHub(
  bolum: string | null,
  mailSettings: string | null | undefined,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  return mailSettings === "rules";
}

export function isEkolojikMailBulkHub(
  bolum: string | null,
  mailBulk: string | null,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  const raw = mailBulk?.toLowerCase();
  return raw === "1" || raw === "true";
}

export function isEkolojikMailSwipeHub(
  bolum: string | null,
  mailSwipe: string | null,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  const raw = mailSwipe?.toLowerCase();
  return raw === "1" || raw === "true";
}
