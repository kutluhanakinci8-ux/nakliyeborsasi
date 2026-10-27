export function buildMessagingMeetDeepLink(threadId: string): string {
  if (typeof window === "undefined") {
    return `/messaging?tab=chat&threadId=${encodeURIComponent(threadId)}&meet=1`;
  }
  return `${window.location.origin}/messaging?tab=chat&threadId=${encodeURIComponent(threadId)}&meet=1`;
}

export function isMeetDeepLinkActive(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return new URLSearchParams(window.location.search).get("meet") === "1";
}

export function isLikelyMobileBrowser(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
