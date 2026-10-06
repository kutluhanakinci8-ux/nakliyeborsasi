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

export function isEkolojikSocialHubInboxTab(
  bolum: string | null,
  tab: string | null,
): boolean {
  return bolum === "sosyal" && tab === "inbox";
}
