"use client";

import { useEffect, useState } from "react";
import {
  initMailTheme,
  toggleMailTheme,
  type MailTheme,
} from "@/lib/mailTheme";

export function MailThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<MailTheme>("light");

  useEffect(() => {
    setTheme(initMailTheme());
  }, []);

  return (
    <>
      {children}
      <button
        type="button"
        className="mail-theme-fab"
        onClick={() => setTheme((prev) => toggleMailTheme(prev))}
        title={theme === "dark" ? "Açık tema" : "Koyu tema"}
        aria-label="Tema değiştir"
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>
    </>
  );
}
