import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type AccountNotificationPreferences = {
  notifyNewOffers: boolean;
  notifyMessages: boolean;
  notifyAuctions: boolean;
  notifyWeeklyDigest: boolean;
  notifyPushNewOffers?: boolean;
  notifyPushMessages?: boolean;
  notifyPushAuctions?: boolean;
  notifyPushMessagingChat?: boolean;
  aiMailAssistConsent?: boolean;
};

/** E-posta kanalı matris anahtarları (push / AI alanları hariç). */
export type AccountEmailNotificationPreferenceKey =
  | "notifyNewOffers"
  | "notifyMessages"
  | "notifyAuctions"
  | "notifyWeeklyDigest";

async function apiFetch<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(
    `${PublicApiConfiguration.resolveBaseUrl()}/${path}`,
    { ...init, headers },
  );
  if (!response.ok) {
    throw new Error(`API failed: ${path}`);
  }
  return (await response.json()) as T;
}

export async function fetchNotificationPreferences(
  accessToken: string,
): Promise<AccountNotificationPreferences> {
  const payload = await apiFetch<{ preferences: AccountNotificationPreferences }>(
    accessToken,
    "me/notification-preferences",
  );
  return payload.preferences;
}

export type NotificationPreferenceMatrixEvent = {
  eventCode: string;
  category: string;
  labelTr: string;
  preferenceKey: AccountEmailNotificationPreferenceKey | null;
  pushPreferenceKey?:
    | "notifyPushNewOffers"
    | "notifyPushMessages"
    | "notifyPushAuctions"
    | "notifyPushMessagingChat"
    | null;
  editable: boolean;
  emailEnabled: boolean;
  channels: { email: boolean; push: boolean | null };
};

export async function fetchNotificationPreferenceMatrix(
  accessToken: string,
): Promise<{
  preferences: AccountNotificationPreferences;
  events: NotificationPreferenceMatrixEvent[];
}> {
  return apiFetch(accessToken, "me/notification-preferences/matrix");
}

export async function updateNotificationPreferences(
  accessToken: string,
  patch: Partial<AccountNotificationPreferences>,
): Promise<AccountNotificationPreferences> {
  const payload = await apiFetch<{ preferences: AccountNotificationPreferences }>(
    accessToken,
    "me/notification-preferences",
    { method: "PATCH", body: JSON.stringify(patch) },
  );
  return payload.preferences;
}
