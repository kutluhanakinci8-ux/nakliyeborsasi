const BASE_TITLE = "Lerta Posta";

export function syncMailUnreadBadge(unreadCount: number): void {
  if (typeof document !== "undefined") {
    document.title =
      unreadCount > 0 ? `(${unreadCount}) ${BASE_TITLE}` : BASE_TITLE;
  }
  if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
    const nav = navigator as Navigator & {
      setAppBadge?: (count: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (unreadCount > 0) {
      void nav.setAppBadge?.(Math.min(unreadCount, 99));
    } else {
      void nav.clearAppBadge?.();
    }
  }
}
