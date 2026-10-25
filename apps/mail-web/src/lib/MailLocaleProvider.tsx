"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  formatMailDateTime,
  mailLocaleTag,
  persistMailTimeZone,
  persistMailUiLocale,
  readMailTimeZone,
  readMailUiLocale,
  resolveInitialLocaleFromUrl,
  t,
  type MailTimeZoneId,
  type MailUiLocale,
} from "./mailLocale";

type MailLocaleContextValue = {
  locale: MailUiLocale;
  setLocale: (locale: MailUiLocale) => void;
  timeZone: MailTimeZoneId;
  setTimeZone: (zone: MailTimeZoneId) => void;
  t: (key: string) => string;
  formatDateTime: (iso: string) => string;
  localeTag: string;
};

const MailLocaleContext = createContext<MailLocaleContextValue | null>(null);

export function MailLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<MailUiLocale>("tr");
  const [timeZone, setTimeZoneState] =
    useState<MailTimeZoneId>("Europe/Istanbul");

  useEffect(() => {
    const fromUrl = resolveInitialLocaleFromUrl();
    const initial = fromUrl ?? readMailUiLocale();
    setLocaleState(initial);
    persistMailUiLocale(initial);
    setTimeZoneState(readMailTimeZone());
  }, []);

  const setLocale = useCallback((next: MailUiLocale) => {
    setLocaleState(next);
    persistMailUiLocale(next);
  }, []);

  const setTimeZone = useCallback((next: MailTimeZoneId) => {
    setTimeZoneState(next);
    persistMailTimeZone(next);
  }, []);

  const value = useMemo<MailLocaleContextValue>(
    () => ({
      locale,
      setLocale,
      timeZone,
      setTimeZone,
      t: (key: string) => t(key, locale),
      formatDateTime: (iso: string) => formatMailDateTime(iso, locale, timeZone),
      localeTag: mailLocaleTag(locale),
    }),
    [locale, setLocale, timeZone, setTimeZone],
  );

  return (
    <MailLocaleContext.Provider value={value}>
      {children}
    </MailLocaleContext.Provider>
  );
}

export function useMailLocale(): MailLocaleContextValue {
  const ctx = useContext(MailLocaleContext);
  if (!ctx) {
    throw new Error("useMailLocale requires MailLocaleProvider");
  }
  return ctx;
}
