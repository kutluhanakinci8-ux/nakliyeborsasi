"use client";

import { useEffect, useState } from "react";
import {
  ensureSystemThemeListener,
  initMailTheme,
  MAIL_THEME_MODE_CHANGE_EVENT,
  readStoredThemeMode,
  resolveEffectiveTheme,
  toggleMailTheme,
  type MailThemeMode,
} from "@/lib/mailTheme";
import { initReadFontScale } from "@/lib/mailDisplayPrefs";

export function MailThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<MailThemeMode>("light");

  useEffect(() => {
    setThemeMode(initMailTheme());
    initReadFontScale();
    ensureSystemThemeListener();

    const onModeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ mode: MailThemeMode }>).detail;
      const mode = detail?.mode ?? readStoredThemeMode();
      if (mode) {
        setThemeMode(mode);
      }
    };
    window.addEventListener(MAIL_THEME_MODE_CHANGE_EVENT, onModeChange);
    return () =>
      window.removeEventListener(MAIL_THEME_MODE_CHANGE_EVENT, onModeChange);
  }, []);

  const effective = resolveEffectiveTheme(themeMode);
  const fabTitle =
    themeMode === "system"
      ? `Sistem teması (şu an ${mailThemeModeLabel(effective).toLowerCase()}) — tıklayınca sabit ${effective === "dark" ? "açık" : "koyu"} mod`
      : effective === "dark"
        ? "Açık temaya geç"
        : "Koyu temaya geç";

  return (
    <>
      {children}
      <button
        type="button"
        className={
          themeMode === "system"
            ? "mail-theme-fab mail-theme-fab--system"
            : "mail-theme-fab"
        }
        onClick={() => setThemeMode(toggleMailTheme())}
        title={fabTitle}
        aria-label="Tema değiştir"
      >
        {effective === "dark" ? "☀" : "☾"}
        {themeMode === "system" ? (
          <span className="mail-theme-fab-system-dot" aria-hidden="true" />
        ) : null}
      </button>
    </>
  );
}
