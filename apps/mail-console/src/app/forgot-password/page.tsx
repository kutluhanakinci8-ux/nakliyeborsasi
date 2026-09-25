"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset } from "@/lib/consoleApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch {
      setError("İstek gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Şifre sıfırlama</h1>
        {sent ? (
          <p>
            E-posta adresinize bağlantı gönderildi (hesap varsa). Gelen kutunuzu
            kontrol edin.
          </p>
        ) : (
          <>
            <p style={{ color: "var(--muted)" }}>
              Lerta Mail giriş e-postanızı girin; sıfırlama bağlantısı gönderilir.
            </p>
            {error ? <p className="auth-error">{error}</p> : null}
            <label htmlFor="email">E-posta</label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="btn" type="submit" disabled={loading}>
              Bağlantı gönder
            </button>
          </>
        )}
        <p style={{ marginTop: 16, fontSize: "0.9rem" }}>
          <Link href="/login">Giriş</Link>
        </p>
      </form>
    </div>
  );
}
