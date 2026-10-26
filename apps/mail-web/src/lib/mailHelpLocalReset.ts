import { OFFLINE_DB_NAME } from "./mailOfflineCache";

const INBOX_TOOLBAR_KEYS = [
  "lerta-mail-inbox-focus-lane",
  "lerta-mail-inbox-query-filters",
  "lerta-mail-inbox-user-category-filters",
] as const;

export async function deleteOfflineMailDatabase(): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(OFFLINE_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("IndexedDB silinemedi"));
    request.onblocked = () => resolve();
  });
}

export function resetInboxSearchAndListLocalPrefs(): void {
  try {
    for (const key of INBOX_TOOLBAR_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

export async function resetMailLocalTroubleshootingCaches(): Promise<void> {
  resetInboxSearchAndListLocalPrefs();
  await deleteOfflineMailDatabase();
}

export function buildMailClientDiagnostics(): Record<string, unknown> {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const win = typeof window !== "undefined" ? window : undefined;
  return {
    product: "Lerta Posta",
    collectedAt: new Date().toISOString(),
    deploySha: process.env.NEXT_PUBLIC_DEPLOY_SHA ?? null,
    deployTime: process.env.NEXT_PUBLIC_DEPLOY_TIME ?? null,
    userAgent: nav?.userAgent ?? null,
    language: nav?.language ?? null,
    platform: nav?.platform ?? null,
    standalonePwa: win ? win.matchMedia("(display-mode: standalone)").matches : null,
    notificationPermission:
      typeof Notification !== "undefined" ? Notification.permission : null,
    serviceWorker: nav && "serviceWorker" in nav,
    pushManager: win && "PushManager" in win,
    viewport: win
      ? { width: win.innerWidth, height: win.innerHeight, dpr: win.devicePixelRatio }
      : null,
    timeZone:
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : null,
  };
}

export function downloadDiagnosticsJson(payload: Record<string, unknown>): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `lerta-posta-diagnostics-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
