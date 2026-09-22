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
import { useRouter } from "next/navigation";
import { WebAccessTokenStorage } from "../lib/WebAccessTokenStorage";
import {
  AuthSessionRecord,
  SessionApiClient,
} from "../lib/SessionApiClient";

type WebSessionContextValue = {
  accessToken: string;
  session: AuthSessionRecord | null;
  locale: string;
  setLocale: (locale: string) => void;
  setAccessToken: (token: string) => void;
  refreshSession: () => Promise<void>;
  logout: () => void;
  isReady: boolean;
};

const WebSessionContext = createContext<WebSessionContextValue | null>(null);

export function WebSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [accessToken, setAccessTokenState] = useState("");
  const [session, setSession] = useState<AuthSessionRecord | null>(null);
  const [locale, setLocaleState] = useState("tr");

  const setLocale = useCallback((nextLocale: string) => {
    setLocaleState(nextLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nb-ui-locale", nextLocale);
    }
  }, []);
  const [isReady, setIsReady] = useState(false);

  const setAccessToken = useCallback((token: string) => {
    setAccessTokenState(token);
    if (token) {
      WebAccessTokenStorage.save(token);
    } else {
      WebAccessTokenStorage.clear();
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const token = WebAccessTokenStorage.read();
    if (!token) {
      setAccessTokenState("");
      setSession(null);
      return;
    }
    setAccessTokenState(token);
    const nextSession = await SessionApiClient.fetchSession(token);
    setSession(nextSession);
  }, []);

  const logout = useCallback(() => {
    WebAccessTokenStorage.clear();
    setAccessTokenState("");
    setSession(null);
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLocale = window.localStorage.getItem("nb-ui-locale");
      if (savedLocale) {
        setLocaleState(savedLocale);
      }
    }
    const token = WebAccessTokenStorage.read();
    if (!token) {
      setIsReady(true);
      return;
    }
    setAccessTokenState(token);
    void SessionApiClient.fetchSession(token)
      .then(setSession)
      .catch(() => {
        WebAccessTokenStorage.clear();
        setAccessTokenState("");
      })
      .finally(() => setIsReady(true));
  }, []);

  const value = useMemo(
    () => ({
      accessToken,
      session,
      locale,
      setLocale,
      setAccessToken,
      refreshSession,
      logout,
      isReady,
    }),
    [
      accessToken,
      session,
      locale,
      setAccessToken,
      refreshSession,
      logout,
      isReady,
    ],
  );

  return (
    <WebSessionContext.Provider value={value}>
      {children}
    </WebSessionContext.Provider>
  );
}

export function useWebSession(): WebSessionContextValue {
  const context = useContext(WebSessionContext);
  if (!context) {
    throw new Error("useWebSession requires WebSessionProvider");
  }
  return context;
}
