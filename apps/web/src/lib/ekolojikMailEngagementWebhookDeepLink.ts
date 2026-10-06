import { EKOLOJIK_HUB_PATH } from "./ekolojikSocialMessagingDeepLink";
import type { MailWebEmbedHandoff } from "./mailWebEmbedDeepLink";

export function readEkolojikMailEngagementWebhookFromSearchParams(
  searchParams: URLSearchParams,
): Pick<MailWebEmbedHandoff, "mailSettingsTab" | "mailEngagementAssist"> {
  const raw =
    searchParams.get("mailEngagement") ??
    searchParams.get("engagement") ??
    searchParams.get("mailWebhookAnalytics");
  const mailEngagementAssist =
    raw === "1" || raw?.toLowerCase() === "true" ? true : undefined;
  if (!mailEngagementAssist) {
    return {};
  }
  return {
    mailSettingsTab: "deliverability",
    mailEngagementAssist: true,
  };
}

export function ekolojikMailEngagementWebhookHubHref(): string {
  const params = new URLSearchParams({
    bolum: "posta",
    mailSettings: "deliverability",
    mailEngagement: "1",
  });
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function isEkolojikMailEngagementWebhookHub(
  bolum: string | null,
  mailSettings: string | null | undefined,
  mailEngagement: string | null,
): boolean {
  if (bolum !== "posta" && bolum !== null && bolum !== "") {
    return false;
  }
  if (mailSettings !== "deliverability") {
    return false;
  }
  const raw = mailEngagement?.toLowerCase();
  return raw === "1" || raw === "true";
}
