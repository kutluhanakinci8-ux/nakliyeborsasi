export type MailTheme = "light" | "dark";

/** Kullanıcı tercihi; `system` işletim sistemi temasını izler. */
export type MailThemeMode = MailTheme | "system";

export const MAIL_THEME_STORAGE_KEY = "lerta-mail-theme";

/** `applyMailThemeMode` sonrası diğer bileşenlerin senkron kalması için. */
export const MAIL_THEME_MODE_CHANGE_EVENT = "lerta-mail-theme-mode-change";

const STORAGE_KEY = MAIL_THEME_STORAGE_KEY;

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function getSystemPrefersDark(): boolean {
  return systemPrefersDark();
}

export function resolveEffectiveTheme(mode: MailThemeMode): MailTheme {
  if (mode === "system") {
    return systemPrefersDark() ? "dark" : "light";
  }
  return mode;
}

export function mailThemeModeLabel(mode: MailThemeMode): string {
  if (mode === "system") {
    return "Sistem";
  }
  return mode === "dark" ? "Koyu" : "Açık";
}

export function readMailThemeModeFromDocument(): MailThemeMode | null {
  if (typeof document === "undefined") {
    return null;
  }
  const value = document.documentElement.dataset.mailThemeMode;
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return null;
}

export function readStoredThemeMode(): MailThemeMode | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return null;
}

function notifyMailThemeModeChange(mode: MailThemeMode): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(MAIL_THEME_MODE_CHANGE_EVENT, { detail: { mode } }),
  );
}

export function applyMailThemeMode(mode: MailThemeMode): void {
  const effective = resolveEffectiveTheme(mode);
  document.documentElement.dataset.mailTheme = effective;
  document.documentElement.dataset.mailThemeMode = mode;
  document.documentElement.dataset.mailThemeFollowsSystem = mode === "system"
    ? "true"
    : "false";
  localStorage.setItem(STORAGE_KEY, mode);
  notifyMailThemeModeChange(mode);
}

/** @deprecated use applyMailThemeMode */
export function applyMailTheme(theme: MailTheme): void {
  applyMailThemeMode(theme);
}

export function initMailTheme(): MailThemeMode {
  const stored = readStoredThemeMode();
  if (stored) {
    applyMailThemeMode(stored);
    return stored;
  }
  const mode: MailThemeMode = systemPrefersDark() ? "system" : "light";
  applyMailThemeMode(mode);
  return mode;
}

/** FAB: sistem modundan çıkarıp sabit açık/koyu seçer (OS ile senkron kesilir). */
export function toggleMailTheme(currentMode?: MailThemeMode): MailThemeMode {
  const mode =
    currentMode ?? readStoredThemeMode() ?? readMailThemeModeFromDocument() ?? "light";
  const effective = resolveEffectiveTheme(mode);
  const next: MailThemeMode = effective === "dark" ? "light" : "dark";
  applyMailThemeMode(next);
  return next;
}

let systemThemeListenerAttached = false;

/** `system` modunda OS tema değişimini uygular. */
export function ensureSystemThemeListener(): void {
  if (typeof window === "undefined" || systemThemeListenerAttached) {
    return;
  }
  systemThemeListenerAttached = true;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    const mode = readStoredThemeMode() ?? "system";
    if (mode === "system") {
      applyMailThemeMode("system");
    }
  };
  media.addEventListener("change", onChange);
}
