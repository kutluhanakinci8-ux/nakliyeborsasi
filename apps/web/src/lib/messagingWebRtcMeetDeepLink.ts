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

export function buildMessagingSfuPilotDeepLink(threadId: string): string {
  if (typeof window === "undefined") {
    return `/messaging?tab=chat&threadId=${encodeURIComponent(threadId)}&sfuPilot=1`;
  }
  return `${window.location.origin}/messaging?tab=chat&threadId=${encodeURIComponent(threadId)}&sfuPilot=1`;
}

export function isSfuPilotDeepLinkActive(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return new URLSearchParams(window.location.search).get("sfuPilot") === "1";
}

export function isNativeRtcDeepLinkActive(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return new URLSearchParams(window.location.search).get("nativeRtc") === "1";
}

export function readNativeRtcBridgeIdFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = new URLSearchParams(window.location.search).get("bridgeId");
  return value && value.length > 0 ? value : null;
}

export function isLikelyMobileBrowser(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
