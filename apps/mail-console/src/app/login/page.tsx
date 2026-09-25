"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const { setAccessToken } = useConsoleSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = await login(email.trim(), password);
      setAccessToken(token);
      router.replace("/dashboard");
    } catch {
      setError("E-posta veya şifre hatalı.");
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
        <input
          id="password"
          className="input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Giriş…" : "Giriş yap"}
        </button>
        <p style={{ marginTop: 16, fontSize: "0.9rem" }}>
          Hesabınız yok mu? <Link href="/register">Kayıt olun</Link>
        </p>
      </form>
    </div>
  );
}
