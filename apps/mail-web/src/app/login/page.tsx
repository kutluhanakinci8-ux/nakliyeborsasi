"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { completeTotpLogin, login } from "@/lib/mailApi";
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
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Lerta Posta</h1>
        <p>
          Kurumsal gelen kutusu — <strong>lerta.com.tr</strong>
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
    </div>
  );
}
