"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset } from "@/lib/mailApi";

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
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Şifre sıfırlama</h1>
        {sent ? (
          <p>E-posta gönderildi (hesap varsa). Gelen kutunuzu kontrol edin.</p>
        ) : (
          <>
            {error ? <p className="login-error">{error}</p> : null}
            <label htmlFor="email">Giriş e-postası</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              Bağlantı gönder
            </button>
          </>
        )}
        <p style={{ marginTop: 16 }}>
          <Link href="/login">Giriş</Link>
        </p>
      </form>
    </div>
  );
}
