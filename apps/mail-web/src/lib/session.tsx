"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "lerta_mail_access_token";

type SessionContextValue = {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function MailSessionProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setTokenState(localStorage.getItem(STORAGE_KEY));
  }, []);

  const setAccessToken = useCallback((token: string | null) => {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setTokenState(token);
  }, []);

  const logout = useCallback(() => setAccessToken(null), [setAccessToken]);

  const value = useMemo(
    () => ({ accessToken, setAccessToken, logout }),
    [accessToken, setAccessToken, logout],
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
