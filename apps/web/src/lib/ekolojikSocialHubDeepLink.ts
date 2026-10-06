import { EKOLOJIK_HUB_PATH } from "./ekolojikSocialMessagingDeepLink";

/** OAuth callback + bağlantılar sekmesi (Ekolojik hub). */
export const EKOLOJIK_SOCIAL_HUB_CONNECTIONS_QUERY =
  "bolum=sosyal&tab=connections";

export const EKOLOJIK_SOCIAL_OAUTH_WEB_RETURN_QUERY =
  EKOLOJIK_SOCIAL_HUB_CONNECTIONS_QUERY;

export function ekolojikSocialHubConnectionsHref(): string {
  return `${EKOLOJIK_HUB_PATH}?${EKOLOJIK_SOCIAL_HUB_CONNECTIONS_QUERY}`;
}

/** Social Hub gelen kutusu sekmesi (özet + kanal senkronu). */
export const EKOLOJIK_SOCIAL_HUB_INBOX_QUERY = "bolum=sosyal&tab=inbox";

export function ekolojikSocialHubInboxHref(): string {
  return `${EKOLOJIK_HUB_PATH}?${EKOLOJIK_SOCIAL_HUB_INBOX_QUERY}`;
}

export function isEkolojikSocialHubTab(
  bolum: string | null,
  tab: string | null,
  expectedTab: string,
): boolean {
  return bolum === "sosyal" && tab === expectedTab;
}

export function isEkolojikSocialHubInboxTab(
  bolum: string | null,
  tab: string | null,
): boolean {
  return isEkolojikSocialHubTab(bolum, tab, "inbox");
}

export function isEkolojikSocialHubPublishingTab(
  bolum: string | null,
  tab: string | null,
): boolean {
  return isEkolojikSocialHubTab(bolum, tab, "publishing");
}

export function isEkolojikSocialHubTemplatesTab(
  bolum: string | null,
  tab: string | null,
): boolean {
  return isEkolojikSocialHubTab(bolum, tab, "templates");
}

export const EKOLOJIK_SOCIAL_HUB_TEMPLATES_QUERY =
  "bolum=sosyal&tab=templates";

export function ekolojikSocialHubTemplatesHref(templateId?: string): string {
  const params = new URLSearchParams({
    bolum: "sosyal",
    tab: "templates",
  });
  if (templateId?.trim()) {
    params.set("templateId", templateId.trim());
  }
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function isEkolojikSocialHubAnalyticsTab(
  bolum: string | null,
  tab: string | null,
): boolean {
  return isEkolojikSocialHubTab(bolum, tab, "analytics");
}

export const EKOLOJIK_SOCIAL_HUB_ANALYTICS_QUERY =
  "bolum=sosyal&tab=analytics";

export function ekolojikSocialHubAnalyticsHref(highlightUtmCampaign?: string): string {
  const params = new URLSearchParams({
    bolum: "sosyal",
    tab: "analytics",
  });
  if (highlightUtmCampaign?.trim()) {
    params.set("utm_campaign", highlightUtmCampaign.trim());
  }
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function readEkolojikAnalyticsUtmHighlight(
  searchParams: URLSearchParams,
): string | null {
  return (
    searchParams.get("utm_campaign")?.trim() ??
    searchParams.get("utmCampaign")?.trim() ??
    null
  );
}

export type EkolojikTelegramHubAction = "connect" | "channel" | "discussion";

export function ekolojikSocialHubTelegramHref(
  action?: EkolojikTelegramHubAction,
): string {
  const params = new URLSearchParams({
    bolum: "sosyal",
    tab: "connections",
    platform: "TELEGRAM",
  });
  if (action) {
    params.set("telegram", action);
  }
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function isEkolojikSocialHubTelegramConnections(
  bolum: string | null,
  tab: string | null,
  platform: string | null,
): boolean {
  return (
    bolum === "sosyal" &&
    tab === "connections" &&
    platform?.toUpperCase() === "TELEGRAM"
  );
}

export type EkolojikSocialPublishingUtm = {
  utmCampaign?: string;
  utmSource?: string;
  utmMedium?: string;
  utmContent?: string;
};

export const EKOLOJIK_SOCIAL_HUB_PUBLISHING_QUERY = "bolum=sosyal&tab=publishing";

export function ekolojikSocialHubPublishingHref(
  utm?: EkolojikSocialPublishingUtm,
): string {
  const params = new URLSearchParams({
    bolum: "sosyal",
    tab: "publishing",
  });
  if (utm?.utmCampaign?.trim()) {
    params.set("utm_campaign", utm.utmCampaign.trim());
  }
  if (utm?.utmSource?.trim()) {
    params.set("utm_source", utm.utmSource.trim());
  }
  if (utm?.utmMedium?.trim()) {
    params.set("utm_medium", utm.utmMedium.trim());
  }
  if (utm?.utmContent?.trim()) {
    params.set("utm_content", utm.utmContent.trim());
  }
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

/** URL search params → compose UTM alanları (Ekolojik yayın deep link). */
export function readEkolojikPublishingUtmFromSearchParams(
  searchParams: URLSearchParams,
): EkolojikSocialPublishingUtm {
  return {
    utmCampaign:
      searchParams.get("utm_campaign") ??
      searchParams.get("utmCampaign") ??
      undefined,
    utmSource:
      searchParams.get("utm_source") ??
      searchParams.get("utmSource") ??
      undefined,
    utmMedium:
      searchParams.get("utm_medium") ??
      searchParams.get("utmMedium") ??
      undefined,
    utmContent:
      searchParams.get("utm_content") ??
      searchParams.get("utmContent") ??
      undefined,
  };
}

export function isEkolojikSocialHubHealthTab(
  bolum: string | null,
  tab: string | null,
): boolean {
  return isEkolojikSocialHubTab(bolum, tab, "health");
}

export function ekolojikSocialHubHealthHref(): string {
  const params = new URLSearchParams({
    bolum: "sosyal",
    tab: "health",
  });
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}

export function isEkolojikSocialHubIntegrationGate(
  bolum: string | null,
  tab: string | null,
  integrationGate: string | null,
): boolean {
  if (bolum !== "sosyal" || tab !== "connections") {
    return false;
  }
  const raw = integrationGate?.toLowerCase();
  return raw === "1" || raw === "true";
}

export function ekolojikSocialHubIntegrationGateHref(): string {
  const params = new URLSearchParams({
    bolum: "sosyal",
    tab: "connections",
    integration_gate: "1",
  });
  return `${EKOLOJIK_HUB_PATH}?${params.toString()}`;
}
