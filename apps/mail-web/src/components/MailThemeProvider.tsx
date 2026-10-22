"use client";

import { useEffect, useState } from "react";
import {
  ensureSystemThemeListener,
  initMailTheme,
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
  }, []);

  const effective = resolveEffectiveTheme(themeMode);

  return (
    <>
      {children}
      <button
        type="button"
        className="mail-theme-fab"
        onClick={() => setThemeMode((prev) => toggleMailTheme(prev))}
        title={effective === "dark" ? "Açık tema" : "Koyu tema"}
        aria-label="Tema değiştir"
      >
        {effective === "dark" ? "☀" : "☾"}
      </button>
    </>
  );
}
