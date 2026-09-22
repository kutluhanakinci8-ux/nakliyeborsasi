"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthApiClient } from "../../../lib/AuthApiClient";
import { isPlatformAdmin } from "../../../lib/platformAdmin";
import { SessionApiClient } from "../../../lib/SessionApiClient";
import { WebAccessTokenStorage } from "../../../lib/WebAccessTokenStorage";
import { useWebSession } from "../../../context/WebSessionProvider";

export function AdminLoginPageClient() {
  const router = useRouter();
  const { setAccessToken, refreshSession, accessToken, session, isReady } =
    useWebSession();
  const [emailAddress, setEmailAddress] = useState("admin@nakliyeborsasi.local");
  const [password, setPassword] = useState("AdminPass123!");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!isReady || !accessToken || !session) {
      return;
    }
    if (isPlatformAdmin(session)) {
      router.replace("/admin");
    }
  }, [isReady, accessToken, session, router]);

  async function handleLogin(event: FormEvent): Promise<void> {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage("");
    try {
      const result = await AuthApiClient.login(emailAddress, password);
      const nextSession = await SessionApiClient.fetchSession(result.accessToken);
      if (!isPlatformAdmin(nextSession)) {
        WebAccessTokenStorage.clear();
        setAccessToken("");
        setErrorMessage(
          "Bu hesap platform yöneticisi değil. Üye girişi için /login kullanın.",
        );
        return;
      }
      setAccessToken(result.accessToken);
      await refreshSession();
      router.replace("/admin");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Giriş başarısız");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="platform-admin-login">
      <div className="platform-admin-login-card">
        <p className="platform-admin-login-badge">Platform yönetimi</p>
        <h1>Yönetici girişi</h1>
        <p className="platform-admin-login-lead">
          Firma üyeleri için{" "}
          <Link href="/login">standart giriş</Link> kullanın. Bu ekran tüm
          sistemi yöneten operatör hesabına özeldir.
        </p>
        <form onSubmit={(event) => void handleLogin(event)}>
          <label className="label-light">
            Yönetici e-posta
            <input
              className="input-light"
              value={emailAddress}
              onChange={(event) => setEmailAddress(event.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="label-light">
            Şifre
            <input
              className="input-light"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          {errorMessage ? (
            <p className="error error--light">{errorMessage}</p>
          ) : null}
          <button type="submit" className="platform-admin-btn-primary" disabled={isBusy}>
            {isBusy ? "Giriş yapılıyor…" : "Yönetim paneline gir"}
          </button>
        </form>
      </div>
    </div>
  );
}
