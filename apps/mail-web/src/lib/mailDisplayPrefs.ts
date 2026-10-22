export type MailReadFontScale = "default" | "large";

const THREAD_KEY = "lerta-mail-thread-view";
const FONT_KEY = "lerta-mail-read-font";

export function readThreadViewPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(THREAD_KEY) === "1";
}

export function writeThreadViewPreference(enabled: boolean): void {
  localStorage.setItem(THREAD_KEY, enabled ? "1" : "0");
}

export function readReadFontScale(): MailReadFontScale {
  if (typeof window === "undefined") {
    return "default";
  }
  const v = localStorage.getItem(FONT_KEY);
  return v === "large" ? "large" : "default";
}

export function applyReadFontScale(scale: MailReadFontScale): void {
  document.documentElement.dataset.mailReadFont = scale;
  localStorage.setItem(FONT_KEY, scale);
}

export function initReadFontScale(): MailReadFontScale {
  const scale = readReadFontScale();
  applyReadFontScale(scale);
  return scale;
}
