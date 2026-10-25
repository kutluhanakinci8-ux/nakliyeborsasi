export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  if (!isIosDevice()) {
    return false;
  }
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return !isOtherBrowser;
}

export function isStandaloneMailPwa(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS legacy
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const IOS_PWA_BANNER_KEY = "lerta-mail-ios-pwa-banner-dismissed";

export function isIosPwaBannerDismissed(): boolean {
  try {
    return localStorage.getItem(IOS_PWA_BANNER_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissIosPwaBanner(): void {
  try {
    localStorage.setItem(IOS_PWA_BANNER_KEY, "1");
  } catch {
    /* ignore */
  }
}
