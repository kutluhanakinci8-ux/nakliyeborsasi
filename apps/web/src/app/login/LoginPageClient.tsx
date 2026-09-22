"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthApiClient } from "../../lib/AuthApiClient";
import { SiteLayout } from "../../components/SiteLayout";
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
    <SiteLayout headerVariant="public">
      <section className="auth-page">
        <div className="auth-page-grid">
          <div className="auth-promo">
            <p className="auth-promo-badge">Ukrayna · Türkiye · AB koridoru</p>
            <h1>Yük ve kamyon arama borsası</h1>
            <p>
              İlan arayın, mesajlaşın, ihale açın — taşıyıcı ve yük verenler için tek
              platform.
            </p>
            <ul className="auth-promo-list">
              <li>Canlı marketplace ilanları</li>
              <li>İhale ve teklif yönetimi</li>
              <li>Güven ve entegrasyon modülleri</li>
            </ul>
          </div>
          <div className="auth-card auth-card--light">
            <h2>Üye girişi</h2>
            <p className="muted muted--dark">
              Test: yukveren01 / yuktasiyan01 / yukarayan01 @test… · TestPass123! ·
              Demo: demo@ · DemoPass123! · Platform:{" "}
              <Link href="/admin/login">/admin/login</Link>
            </p>
            <form onSubmit={(event) => void handleLogin(event)}>
              <label className="label-light">
                E-posta
                <input
                  className="input-light"
                  value={emailAddress}
                  onChange={(event) => setEmailAddress(event.target.value)}
                />
              </label>
              <label className="label-light">
                Şifre
                <input
                  className="input-light"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <label className="label-light">
                Dil
                <select
                  className="input-light"
                  value={locale}
                  onChange={(event) => setLocale(event.target.value)}
                >
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                  <option value="uk">Українська</option>
                  <option value="ru">Русский</option>
                </select>
              </label>
              {errorMessage ? <p className="error error--light">{errorMessage}</p> : null}
              <button type="submit" className="btn-gold-wide" disabled={isBusy}>
                {isBusy ? "Giriş yapılıyor…" : "Giriş yap"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
