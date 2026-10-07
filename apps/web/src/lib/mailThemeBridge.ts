/** Parent shell ↔ posta.lerta.com.tr iframe — aynı localStorage anahtarı. */
export type MailTheme = "light" | "dark";

const STORAGE_KEY = "lerta-mail-theme";

export function readStoredMailTheme(): MailTheme | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === "light" || value === "dark") {
    return value;
  }
  return null;
}

export function applyMailThemeOnDocument(theme: MailTheme): void {
  document.documentElement.dataset.mailTheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

export function initParentMailThemeBridge(): MailTheme {
  const stored = readStoredMailTheme();
  if (stored) {
    applyMailThemeOnDocument(stored);
    return stored;
  }
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme: MailTheme = prefersDark ? "dark" : "light";
  applyMailThemeOnDocument(theme);
  return theme;
}
