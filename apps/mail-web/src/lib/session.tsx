"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { MAIL_ACCESS_TOKEN_STORAGE_KEY } from "./mailAccessTokenStorage";

const STORAGE_KEY = MAIL_ACCESS_TOKEN_STORAGE_KEY;

type SessionContextValue = {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function MailSessionProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    try {
      setTokenState(localStorage.getItem(STORAGE_KEY));
    } catch {
      setTokenState(null);
    }
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
