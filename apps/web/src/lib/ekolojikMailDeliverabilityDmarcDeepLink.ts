import { EKOLOJIK_HUB_PATH } from "./ekolojikSocialMessagingDeepLink";
import type { MailWebEmbedHandoff } from "./mailWebEmbedDeepLink";

export function readEkolojikMailDeliverabilityDmarcFromSearchParams(
  searchParams: URLSearchParams,
): Pick<MailWebEmbedHandoff, "mailSettingsTab" | "mailDmarcAssist"> {
  const dmarcRaw =
    searchParams.get("mailDmarc") ?? searchParams.get("dmarc");
  const mailDmarcAssist =
    dmarcRaw === "1" || dmarcRaw?.toLowerCase() === "true" ? true : undefined;
  if (!mailDmarcAssist) {
    return {};
  }
  return {
    mailSettingsTab: "deliverability",
    mailDmarcAssist: true,
  };
}

export function ekolojikMailDmarcHubHref(): string {
  const params = new URLSearchParams({
    bolum: "posta",
    mailSettings: "deliverability",
    mailDmarc: "1",
  });
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

/** DNS & teslimat (P3) — deliverability without DMARC deep-link focus. */
export function isEkolojikMailDnsDeliverabilityHub(
  bolum: string | null,
  mailSettings: string | null | undefined,
  mailDmarc: string | null,
  mailEngagement?: string | null,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  if (mailSettings !== "deliverability") {
    return false;
  }
  const dmarcRaw = mailDmarc?.toLowerCase();
  const engagementRaw = mailEngagement?.toLowerCase();
  return (
    dmarcRaw !== "1" &&
    dmarcRaw !== "true" &&
    engagementRaw !== "1" &&
    engagementRaw !== "true"
  );
}

export function isEkolojikMailDmarcHub(
  bolum: string | null,
  mailSettings: string | null | undefined,
  mailDmarc: string | null,
  mailEngagement?: string | null,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  if (mailSettings !== "deliverability") {
    return false;
  }
  const engagementRaw = mailEngagement?.toLowerCase();
  if (engagementRaw === "1" || engagementRaw === "true") {
    return false;
  }
  const raw = mailDmarc?.toLowerCase();
  return raw === "1" || raw === "true";
}
