"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { completeTotpLogin, login } from "@/lib/mailApi";
import {
  MAIL_CORPORATE_REGISTER,
  MAIL_PILOT_REGISTER,
} from "@/lib/postaOnboardingUrls";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import { useMailSession } from "@/lib/session";
import {
  MAIL_VITRIN_NAV,
  mailVitrinUrl,
} from "@/lib/mailVitrinLinks";

export default function LoginPage() {
  const router = useRouter();
  const { locale, setLocale, t } = useMailLocale();
  const [sessionEnded, setSessionEnded] = useState(false);
  const { setAccessToken } = useMailSession();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setSessionEnded(params.get("oturum") === "sona-erdi");
    } catch {
      setSessionEnded(false);
    }
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [totpChallenge, setTotpChallenge] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (totpChallenge) {
        const token = await completeTotpLogin(totpChallenge, totpCode);
        setAccessToken(token);
        router.replace("/mail");
        return;
      }
      const result = await login(email.trim(), password);
      if (result.kind === "totp") {
        setTotpChallenge(result.challengeToken);
        return;
      }
      setAccessToken(result.accessToken);
      router.replace("/mail");
    } catch {
      setError(
        totpChallenge
          ? locale === "en"
            ? "Invalid verification code."
            : "Doğrulama kodu geçersiz."
          : t("loginError"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page login-page--premium">
      <header className="login-shell-header">
        <a
          className="login-shell-brand"
          href={mailVitrinUrl("/posta")}
          aria-label={t("loginBrandHomeAria")}
        >
          <span className="login-shell-brand-mark" aria-hidden="true">L</span>
          <span className="login-shell-brand-text">
            <span className="login-shell-brand-name">{t("loginBrand")}</span>
            <span className="login-shell-brand-tag">{t("loginTag")}</span>
          </span>
        </a>
        <div className="login-shell-locale" role="group" aria-label={t("languageLabel")}>
          <button
            type="button"
            className={locale === "tr" ? "is-active" : ""}
            onClick={() => setLocale("tr")}
          >
            {t("localeTr")}
          </button>
          <button
            type="button"
            className={locale === "en" ? "is-active" : ""}
            onClick={() => setLocale("en")}
          >
            {t("localeEn")}
          </button>
        </div>
        <nav className="login-shell-nav" aria-label={t("vitrinNavAria")}>
          {MAIL_VITRIN_NAV.map((item) => (
            <a
              key={item.path}
              href={mailVitrinUrl(item.path)}
              className="login-shell-nav-link"
            >
              {t(item.labelKey)}
            </a>
          ))}
        </nav>
      </header>

      <main className="login-shell-main">
        <section className="login-showcase" aria-labelledby="login-showcase-title">
          <p className="login-showcase-eyebrow">{t("loginShowcaseEyebrow")}</p>
          <h1 id="login-showcase-title" className="login-showcase-title">
            {t("loginShowcaseTitle")}
          </h1>
          <p className="login-showcase-lead">{t("loginShowcaseLead")}</p>
          <ul className="login-showcase-features">
            <li>
              <span className="login-feature-icon" aria-hidden="true">✓</span>
              <span>
                <strong>Özel domain</strong> — MX, SPF, DKIM ve DMARC sihirbazı
              </span>
            </li>
            <li>
              <span className="login-feature-icon" aria-hidden="true">✓</span>
              <span>
                <strong>Çoklu kutu</strong> — kurumsal planlarda yönetim panelinden
              </span>
            </li>
            <li>
              <span className="login-feature-icon" aria-hidden="true">✓</span>
              <span>
                <strong>KVKK uyumlu</strong> — veri Türkiye&apos;de, denetlenebilir kayıt
              </span>
            </li>
          </ul>
          <div className="login-showcase-trust">
            <span>posta.lerta.com.tr</span>
            <span className="login-showcase-trust-dot" aria-hidden="true">·</span>
            <span>yonetim.lerta.com.tr</span>
          </div>
        </section>

        <section className="login-panel" aria-labelledby="login-form-title">
          <div className="login-panel-inner">
            <form className="login-form" onSubmit={onSubmit}>
              <h2 id="login-form-title" className="login-form-title">
                {t("loginTitle")}
              </h2>
              <p className="login-form-sub">{t("loginFormSub")}</p>
              {sessionEnded && !error ? (
                <p className="login-info" role="status">
                  {t("loginSessionEnded")}
                </p>
              ) : null}
              {error ? (
                <p className="login-error" role="alert">{error}</p>
              ) : null}
              <div className="login-field">
                <label htmlFor="email">{t("loginEmail")}</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="ornek@sirketiniz.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="login-field">
                <label htmlFor="password">{t("loginPassword")}</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {totpChallenge ? (
                <div className="login-field">
                  <label htmlFor="totp">Authenticator kodu</label>
                  <input
                    id="totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    required
                  />
                </div>
              ) : null}
              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                {loading
                  ? locale === "en"
                    ? "Signing in…"
                    : "Giriş yapılıyor…"
                  : totpChallenge
                    ? locale === "en"
                      ? "Verify"
                      : "Doğrula"
                    : t("loginSubmit")}
              </button>
              <p className="login-forgot">
                <Link href="/forgot-password">Şifremi unuttum</Link>
              </p>
            </form>

            <div className="login-panel-divider" role="separator">
              <span>veya</span>
            </div>

            <aside
              className="login-register"
              aria-labelledby="login-register-title"
            >
              <h3 id="login-register-title" className="login-register-title">
                Yeni müşteri
              </h3>
              <p className="login-register-lead">
                Kayıt yönetim konsolunda tamamlanır; ardından posta kutunuz açılır
                ve webmail&apos;e yönlendirilirsiniz.
              </p>
              <div className="login-register-actions">
                <a
                  className="login-cta login-cta--primary"
                  href={MAIL_CORPORATE_REGISTER}
                >
                  Kurumsal domain ile başla
                </a>
                <a className="login-cta login-cta--ghost" href={MAIL_PILOT_REGISTER}>
                  Pilot / bireysel kayıt
                </a>
              </div>
              <dl className="login-register-meta">
                <div>
                  <dt>Kurumsal</dt>
                  <dd>
                    <code>info@sirketiniz.com</code> — çoklu kutu, DNS paneli
                  </dd>
                </div>
                <div>
                  <dt>Pilot</dt>
                  <dd>
                    <code>adi@lerta.com.tr</code> — tek kutu, hızlı deneme
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>
      </main>

      <footer className="login-shell-footer">
        <span>
          © {new Date().getFullYear()} {t("loginFooterCopy")}
        </span>
        <a href={mailVitrinUrl("/durum")}>{t("loginFooterStatus")}</a>
        <a href={mailVitrinUrl("/kvkk")}>{t("loginFooterKvkk")}</a>
        <a href={mailVitrinUrl("/sss")}>{t("loginFooterFaq")}</a>
      </footer>
    </div>
  );
}
