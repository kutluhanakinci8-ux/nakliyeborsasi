import { AuthenticatedApiClient } from "./AuthenticatedApiClient";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function fetchPushConfig(accessToken: string) {
  return AuthenticatedApiClient.fetchJson(accessToken, "/messaging/push/config") as Promise<{
    config: {
      enabled: boolean;
      publicKey: string | null;
      isolatedVapid?: boolean;
    };
  }>;
}

async function registerPush(
  accessToken: string,
  body: { endpoint: string; p256dh: string; auth: string },
): Promise<void> {
  await AuthenticatedApiClient.fetchJson(accessToken, "/messaging/push/subscribe", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function ensureMessagingWebPush(
  accessToken: string,
): Promise<"enabled" | "unsupported" | "denied" | "unconfigured" | "skipped"> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  const { config } = await fetchPushConfig(accessToken);
  if (!config.enabled || !config.publicKey) {
    return "unconfigured";
  }
  if (Notification.permission === "denied") {
    return "denied";
  }
  await navigator.serviceWorker.register("/messaging-push-sw.js");
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return "denied";
      }
    }
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        config.publicKey,
      ) as BufferSource,
    });
  }
  const json = subscription.toJSON();
  const keys = json.keys;
  if (!json.endpoint || !keys?.p256dh || !keys?.auth) {
    return "skipped";
  }
  await registerPush(accessToken, {
    endpoint: json.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  });
  return "enabled";
}
