export type MailTheme = "light" | "dark";

/** Kullanıcı tercihi; `system` işletim sistemi temasını izler. */
export type MailThemeMode = MailTheme | "system";

const STORAGE_KEY = "lerta-mail-theme";

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function resolveEffectiveTheme(mode: MailThemeMode): MailTheme {
  if (mode === "system") {
    return systemPrefersDark() ? "dark" : "light";
  }
  return mode;
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

export function applyMailThemeMode(mode: MailThemeMode): void {
  const effective = resolveEffectiveTheme(mode);
  document.documentElement.dataset.mailTheme = effective;
  document.documentElement.dataset.mailThemeMode = mode;
  localStorage.setItem(STORAGE_KEY, mode);
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

export function toggleMailTheme(currentMode: MailThemeMode): MailThemeMode {
  const effective = resolveEffectiveTheme(currentMode);
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
