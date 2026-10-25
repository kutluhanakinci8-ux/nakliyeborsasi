"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "lerta_mail_access_token";

function readStoredAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

type SessionContextValue = {
  accessToken: string | null;
  /** localStorage oturum okuması tamamlandı (ilk paint öncesi). */
  sessionReady: boolean;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function MailSessionProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setTokenState] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useLayoutEffect(() => {
    setTokenState(readStoredAccessToken());
    setSessionReady(true);
  }, []);

  const setAccessToken = useCallback((token: string | null) => {
    try {
      if (token) {
        localStorage.setItem(STORAGE_KEY, token);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* üçüncü taraf iframe — localStorage kapalı olabilir */
    }
    setTokenState(token);
  }, []);

  const logout = useCallback(() => setAccessToken(null), [setAccessToken]);

  const value = useMemo(
    () => ({ accessToken, sessionReady, setAccessToken, logout }),
    [accessToken, sessionReady, setAccessToken, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useMailSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("MailSessionProvider required");
  }
  return ctx;
}
