"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { completeTotpLogin, login } from "@/lib/mailApi";
import {
  MAIL_CORPORATE_REGISTER,
  MAIL_PILOT_REGISTER,
} from "@/lib/postaOnboardingUrls";
import { useMailSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const { setAccessToken } = useMailSession();
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
          ? "Doğrulama kodu geçersiz."
          : "E-posta veya şifre hatalı. Kurumsal posta için firma hesabı gerekir.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-page-top">
        <a className="login-platform-link" href="https://www.lerta.com.tr/posta">
          Posta
        </a>
        <span className="login-platform-link">·</span>
        <a className="login-platform-link" href="https://www.lerta.com.tr/mesaj">
          Mesajlaşma
        </a>
        <span className="login-platform-link">·</span>
        <a className="login-platform-link" href="https://www.lerta.com.tr/u88">
          KVKK
        </a>
      </div>
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-card-brand">
          <span className="login-card-brand-mark" aria-hidden="true">@</span>
          <h1 style={{ margin: 0, fontSize: "1.35rem" }}>Lerta Posta</h1>
        </div>
        <p className="login-card-lead">
          Webmail — mevcut hesabınızla giriş. Yeni kullanıcılar önce kayıt olup
          posta kutusunu seçer.
        </p>
        {error ? <p className="login-error">{error}</p> : null}
        <label htmlFor="email">E-posta</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password">Şifre</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {totpChallenge ? (
          <>
            <label htmlFor="totp">Authenticator kodu</label>
            <input
              id="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              required
            />
          </>
        ) : null}
        <button type="submit" disabled={loading}>
          {loading ? "Giriş…" : totpChallenge ? "Doğrula" : "Giriş yap"}
        </button>
        <p style={{ marginTop: 12, fontSize: "0.9rem" }}>
          <Link href="/forgot-password">Şifremi unuttum</Link>
        </p>
      </form>
      <aside className="login-onboarding" aria-labelledby="login-onboarding-title">
        <h2 id="login-onboarding-title">Hesabınız yok mu?</h2>
        <p>
          Kayıt <strong>yonetim.lerta.com.tr</strong> üzerinde yapılır; ardından
          pilot veya kurumsal posta adresiniz açılır ve buraya yönlendirilirsiniz.
        </p>
        <div className="login-onboarding-actions">
          <a className="btn-onboarding btn-onboarding-primary" href={MAIL_PILOT_REGISTER}>
            Bireysel / pilot kayıt
          </a>
          <a
            className="btn-onboarding btn-onboarding-secondary"
            href={MAIL_CORPORATE_REGISTER}
          >
            Kurumsal domain kayıt
          </a>
        </div>
        <ul className="login-onboarding-list">
          <li>
            <strong>Pilot:</strong> tek kutu, örn.{" "}
            <code>sizin-adi@lerta.com.tr</code>
          </li>
          <li>
            <strong>Kurumsal:</strong> <code>info@sirketiniz.com</code> — birden
            fazla kutu yönetim panelinden eklenir
          </li>
        </ul>
      </aside>
    </div>
  );
}
