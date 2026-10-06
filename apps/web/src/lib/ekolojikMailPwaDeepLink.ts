import { EKOLOJIK_HUB_PATH } from "./ekolojikSocialMessagingDeepLink";
import type { MailWebEmbedHandoff } from "./mailWebEmbedDeepLink";

export function readEkolojikMailPwaFromSearchParams(
  searchParams: URLSearchParams,
): Pick<MailWebEmbedHandoff, "mailSettingsTab" | "mailPwaAssist"> {
  const pwaRaw = searchParams.get("mailPwa") ?? searchParams.get("pwa");
  const mailPwaAssist =
    pwaRaw === "1" || pwaRaw?.toLowerCase() === "true" ? true : undefined;
  if (!mailPwaAssist) {
    return {};
  }
  return {
    mailSettingsTab: "notifications",
    mailPwaAssist: true,
  };
}

export function ekolojikMailPwaHubHref(): string {
  const params = new URLSearchParams({
    bolum: "posta",
    mailSettings: "notifications",
    mailPwa: "1",
  });
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function isEkolojikMailNotificationsHub(
  bolum: string | null,
  mailSettings: string | null | undefined,
  mailPwa: string | null,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  if (mailSettings !== "notifications") {
    return false;
  }
  const raw = mailPwa?.toLowerCase();
  return raw !== "1" && raw !== "true";
}

export function isEkolojikMailPwaHub(
  bolum: string | null,
  mailSettings: string | null | undefined,
  mailPwa: string | null,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  if (mailSettings !== "notifications") {
    return false;
  }
  const raw = mailPwa?.toLowerCase();
  return raw === "1" || raw === "true";
}
