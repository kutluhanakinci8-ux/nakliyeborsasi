import type { SocialHubPwaConfig } from "./socialHubTypes";

export type SocialHubHealthPushHookResult =
  | "unsupported"
  | "unconfigured"
  | "skeleton_registered"
  | "skipped";

/**
 * İskelet: kritik sağlık push için Mesajlar VAPID ile hizalanacak kanal.
 * Şimdilik yalnızca tarayıcı desteğini ve sunucu PWA config’ini doğrular.
 */
export async function runSocialHubHealthPushHookSkeleton(
  pwa: SocialHubPwaConfig | undefined,
): Promise<SocialHubHealthPushHookResult> {
  if (!pwa?.healthPushHook || pwa.healthPushHook.status !== "skeleton") {
    return "skipped";
  }
  if (typeof window === "undefined") {
    return "skipped";
  }
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }
  if (Notification.permission === "denied") {
    return "unconfigured";
  }
  return "skeleton_registered";
}
