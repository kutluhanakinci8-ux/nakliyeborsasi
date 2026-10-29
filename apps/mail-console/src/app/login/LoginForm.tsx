"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordField } from "@/components/PasswordField";
import { completeTotpLogin, login } from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

function resolvePostLoginPath(nextParam: string | null): string {
  if (!nextParam || !nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return "/dashboard";
  }
  return nextParam;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postLoginPath = useMemo(
    () => resolvePostLoginPath(searchParams.get("next")),
    [searchParams],
  );
  const { setAccessToken } = useConsoleSession();
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
        router.replace(postLoginPath);
        return;
      }
      const result = await login(email.trim(), password);
      if (result.kind === "totp") {
        setTotpChallenge(result.challengeToken);
        setError("");
        return;
      }
      setAccessToken(result.accessToken);
      router.replace(postLoginPath);
    } catch {
      setError(
        totpChallenge
          ? "Doğrulama kodu geçersiz."
          : "E-posta veya şifre hatalı.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Lerta Mail Yönetim</h1>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Firma hesabınızla giriş yapın.
        </p>
        {error ? <p className="auth-error">{error}</p> : null}
        <label htmlFor="email">E-posta</label>
        <input
          id="email"
          className="input"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password">Şifre</label>
        <PasswordField
          id="password"
          className="input"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          required
        />
        {totpChallenge ? (
          <>
            <label htmlFor="totp">Authenticator kodu</label>
            <input
              id="totp"
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              required
            />
          </>
        ) : null}
        <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Giriş…" : totpChallenge ? "Doğrula" : "Giriş yap"}
        </button>
        <p style={{ marginTop: 16, fontSize: "0.9rem" }}>
          Hesabınız yok mu? <Link href="/register">Kayıt olun</Link>
          {" · "}
          <Link href="/forgot-password">Şifremi unuttum</Link>
        </p>
      </form>
    </div>
  );
}
