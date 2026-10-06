import { EKOLOJIK_HUB_PATH } from "./ekolojikSocialMessagingDeepLink";
import type { MailWebEmbedHandoff } from "./mailWebEmbedDeepLink";

export type EkolojikMailSettingsTab = "accounts" | "deliverability";

export function readEkolojikMailSettingsFromSearchParams(
  searchParams: URLSearchParams,
): Pick<MailWebEmbedHandoff, "mailSettingsTab"> {
  const raw =
    searchParams.get("mailSettings") ??
    searchParams.get("mail_settings") ??
    searchParams.get("postaAyar");
  const tab = raw?.trim();
  if (!tab) {
    return {};
  }
  return { mailSettingsTab: tab };
}

export function ekolojikMailAccountsHubHref(): string {
  const params = new URLSearchParams({
    bolum: "posta",
    mailSettings: "accounts",
  });
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function ekolojikMailDnsHubHref(): string {
  const params = new URLSearchParams({
    bolum: "posta",
    mailSettings: "deliverability",
  });
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function isEkolojikMailSettingsHub(
  bolum: string | null,
  tab: string | null | undefined,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  return tab === "accounts" || tab === "deliverability";
}
