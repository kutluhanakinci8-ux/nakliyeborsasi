"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthApiClient } from "../../lib/AuthApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

export function LoginPageClient() {
  const router = useRouter();
  const { setAccessToken, refreshSession, locale, setLocale, accessToken } =
    useWebSession();
  const [emailAddress, setEmailAddress] = useState("demo@nakliyeborsasi.local");
  const [password, setPassword] = useState("DemoPass123!");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (accessToken) {
      router.replace("/marketplace");
    }
  }, [accessToken, router]);

  async function handleLogin(event: FormEvent): Promise<void> {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage("");
    try {
      const result = await AuthApiClient.login(emailAddress, password);
      setAccessToken(result.accessToken);
      await refreshSession();
      router.replace("/marketplace");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Giriş başarısız");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <p className="pill">Nakliye Borsası · TR + UA–EU</p>
        <h1>Giriş yapın</h1>
        <p className="muted">
          Demo: demo@ veya partner@nakliyeborsasi.local · Şifre: DemoPass123!
        </p>
        <p className="muted auth-tagline">
          Lardi ve Della gibi borsalarda önce arama ve liste görürsünüz; giriş sonrası
          panelimiz aynı yönde gelişiyor.
        </p>
        <form onSubmit={(event) => void handleLogin(event)}>
          <label>
            E-posta
            <input
              value={emailAddress}
              onChange={(event) => setEmailAddress(event.target.value)}
            />
          </label>
          <label>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Dil
            <select value={locale} onChange={(event) => setLocale(event.target.value)}>
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
              <option value="uk">Українська</option>
              <option value="ru">Русский</option>
            </select>
          </label>
          {errorMessage ? <p className="error">{errorMessage}</p> : null}
          <button type="submit" className="btn-primary" disabled={isBusy}>
            {isBusy ? "..." : "Giriş yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
