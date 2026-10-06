import { EKOLOJIK_HUB_PATH } from "./ekolojikSocialMessagingDeepLink";
import type { MailWebEmbedHandoff } from "./mailWebEmbedDeepLink";

export function readEkolojikMailOpsFromSearchParams(
  searchParams: URLSearchParams,
): Pick<MailWebEmbedHandoff, "mailSettingsTab" | "mailOpsAssist"> {
  const settings =
    searchParams.get("mailSettings")?.trim() ??
    searchParams.get("mail_settings")?.trim();
  const opsRaw = searchParams.get("mailOps") ?? searchParams.get("ops");
  const opsFlag =
    opsRaw === "1" || opsRaw?.toLowerCase() === "true" ? true : undefined;
  if (settings !== "ops" && !opsFlag) {
    return {};
  }
  return {
    mailSettingsTab: "ops",
    mailOpsAssist: opsFlag,
  };
}

export function ekolojikMailOpsRunbookHubHref(): string {
  const params = new URLSearchParams({
    bolum: "posta",
    mailSettings: "ops",
    mailOps: "1",
  });
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function isEkolojikMailOpsRunbookHub(
  bolum: string | null,
  mailSettings: string | null | undefined,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  return mailSettings === "ops";
}
