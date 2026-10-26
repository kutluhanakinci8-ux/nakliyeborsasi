import { normalizeFreeformAddressForDirections } from "./mailAddressFormat";

export type LinkBrowserId =
  | "edge"
  | "firefox"
  | "safari"
  | "chrome"
  | "opera"
  | "system";

export type DirectionsAppId =
  | "apple-maps"
  | "google-maps"
  | "waze"
  | "yandex"
  | "citymapper"
  | "system";

const LINK_BROWSER_KEY = "lerta-mail-open-links-with";
const DIRECTIONS_APP_KEY = "lerta-mail-open-directions-with";

export const EXTERNAL_OPEN_PREFS_EVENT = "lerta-mail-external-open-prefs-change";

const LINK_BROWSER_IDS: LinkBrowserId[] = [
  "edge",
  "firefox",
  "safari",
  "chrome",
  "opera",
  "system",
];

const DIRECTIONS_APP_IDS: DirectionsAppId[] = [
  "apple-maps",
  "google-maps",
  "waze",
  "yandex",
  "citymapper",
  "system",
];

function isLinkBrowserId(value: string): value is LinkBrowserId {
  return LINK_BROWSER_IDS.includes(value as LinkBrowserId);
}

function isDirectionsAppId(value: string): value is DirectionsAppId {
  return DIRECTIONS_APP_IDS.includes(value as DirectionsAppId);
}

function notifyPrefsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EXTERNAL_OPEN_PREFS_EVENT));
  }
}

export function readLinkBrowser(): LinkBrowserId {
  if (typeof window === "undefined") {
    return "edge";
  }
  try {
    const raw = localStorage.getItem(LINK_BROWSER_KEY);
    return raw && isLinkBrowserId(raw) ? raw : "edge";
  } catch {
    return "edge";
  }
}

export function writeLinkBrowser(id: LinkBrowserId): void {
  try {
    localStorage.setItem(LINK_BROWSER_KEY, id);
    notifyPrefsChanged();
  } catch {
    /* ignore */
  }
}

export function readDirectionsApp(): DirectionsAppId {
  if (typeof window === "undefined") {
    return defaultDirectionsApp();
  }
  try {
    const raw = localStorage.getItem(DIRECTIONS_APP_KEY);
    return raw && isDirectionsAppId(raw) ? raw : defaultDirectionsApp();
  } catch {
    return defaultDirectionsApp();
  }
}

export function writeDirectionsApp(id: DirectionsAppId): void {
  try {
    localStorage.setItem(DIRECTIONS_APP_KEY, id);
    notifyPrefsChanged();
  } catch {
    /* ignore */
  }
}

function defaultDirectionsApp(): DirectionsAppId {
  if (typeof navigator === "undefined") {
    return "google-maps";
  }
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return "apple-maps";
  }
  return "google-maps";
}

function normalizeHttpUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function openWithSystemBrowser(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Harici http(s) bağlantıları — Ayarlar → Bağlantıları şununla aç tercihine göre açar. */
export function openExternalHttpUrl(url: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const absolute = normalizeHttpUrl(url);
  const choice = readLinkBrowser();

  if (choice === "system") {
    openWithSystemBrowser(absolute);
    return;
  }

  const withoutScheme = absolute.replace(/^https?:\/\//i, "");

  const attempts: string[] = [];
  switch (choice) {
    case "edge":
      attempts.push(`microsoft-edge-https://${withoutScheme}`);
      attempts.push(`microsoft-edge-http://${withoutScheme}`);
      break;
    case "firefox":
      attempts.push(
        `firefox://open-url?url=${encodeURIComponent(absolute)}`,
      );
      break;
    case "safari":
      attempts.push(absolute);
      break;
    case "chrome":
      attempts.push(`googlechromes://${withoutScheme}`);
      attempts.push(`googlechrome://${withoutScheme}`);
      break;
    case "opera":
      attempts.push(`opera-http://${withoutScheme}`);
      attempts.push(`opera-https://${withoutScheme}`);
      break;
    default:
      break;
  }

  const scheme = attempts[0];
  if (!scheme) {
    openWithSystemBrowser(absolute);
    return;
  }
  const opened = window.open(scheme, "_blank", "noopener,noreferrer");
  if (!opened) {
    openWithSystemBrowser(absolute);
  }
}

/** Adres veya koordinat ile yol tarifi — Ayarlar → Yol tariflerini şununla aç. */
export function openDirectionsTo(destination: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const dest = normalizeFreeformAddressForDirections(destination);
  if (!dest) {
    return;
  }
  const encoded = encodeURIComponent(dest);
  const app = readDirectionsApp();

  let url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  switch (app) {
    case "apple-maps":
      url = `https://maps.apple.com/?daddr=${encoded}`;
      break;
    case "google-maps":
      url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
      break;
    case "waze":
      url = `https://waze.com/ul?q=${encoded}&navigate=yes`;
      break;
    case "yandex":
      url = `https://yandex.com/maps/?rtext=~${encoded}`;
      break;
    case "citymapper":
      url = `citymapper://directions?endname=${encoded}`;
      break;
    case "system":
      url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
      break;
  }

  if (app === "citymapper") {
    window.location.href = url;
    window.setTimeout(
      () =>
        openWithSystemBrowser(
          `https://citymapper.com/directions?endname=${encoded}`,
        ),
      500,
    );
    return;
  }

  openExternalHttpUrl(url);
}

export const LINK_BROWSER_OPTIONS: LinkBrowserId[] = [...LINK_BROWSER_IDS];
export const DIRECTIONS_APP_OPTIONS: DirectionsAppId[] = [...DIRECTIONS_APP_IDS];
