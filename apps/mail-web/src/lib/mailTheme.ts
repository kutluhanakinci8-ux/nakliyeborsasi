export type MailTheme = "light" | "dark";

const STORAGE_KEY = "lerta-mail-theme";

export function readStoredTheme(): MailTheme | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === "light" || value === "dark") {
    return value;
  }
  return null;
}

export function applyMailTheme(theme: MailTheme): void {
  document.documentElement.dataset.mailTheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

export function initMailTheme(): MailTheme {
  const stored = readStoredTheme();
  if (stored) {
    applyMailTheme(stored);
    return stored;
  }
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme: MailTheme = prefersDark ? "dark" : "light";
  applyMailTheme(theme);
  return theme;
}

export function toggleMailTheme(current: MailTheme): MailTheme {
  const next: MailTheme = current === "dark" ? "light" : "dark";
  applyMailTheme(next);
  return next;
}
