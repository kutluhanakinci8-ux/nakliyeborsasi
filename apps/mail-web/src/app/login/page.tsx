"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/mailApi";
import { useMailSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const { setAccessToken } = useMailSession();
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
      router.replace("/mail");
    } catch {
      setError("E-posta veya şifre hatalı. Kurumsal posta için firma hesabı gerekir.");
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
        <button type="submit" disabled={loading}>
          {loading ? "Giriş…" : "Giriş yap"}
        </button>
      </form>
    </div>
  );
}
