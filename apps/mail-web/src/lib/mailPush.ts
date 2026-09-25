import {
  fetchMailPushConfig,
  registerMailPushSubscription,
  unregisterMailPushSubscription,
} from "./mailApi";

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

export async function subscribeMailWebPush(
  accessToken: string,
): Promise<"enabled" | "unsupported" | "denied" | "unconfigured"> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  const { config } = await fetchMailPushConfig(accessToken);
  if (!config.enabled || !config.publicKey) {
    return "unconfigured";
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return "denied";
  }
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        config.publicKey,
      ) as BufferSource,
    });
  }
  const json = subscription.toJSON();
  const keys = json.keys;
  if (!json.endpoint || !keys?.p256dh || !keys.auth) {
    throw new Error("Push aboneliği oluşturulamadı.");
  }
  await registerMailPushSubscription(accessToken, {
    endpoint: json.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  });
  return "enabled";
}

export async function unsubscribeMailWebPush(
  accessToken: string,
): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return;
  }
  const endpoint = subscription.endpoint;
  await unregisterMailPushSubscription(accessToken, endpoint);
  await subscription.unsubscribe();
}
