"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { registerMailSaas } from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

export default function RegisterPage() {
  const router = useRouter();
  const { setAccessToken } = useConsoleSession();
  const [companyLegalName, setCompanyLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = await registerMailSaas({
        emailAddress: email.trim(),
        password,
        displayName: displayName.trim() || companyLegalName.trim(),
        companyLegalName: companyLegalName.trim(),
      });
      setAccessToken(token);
      router.replace("/domain");
    } catch {
      setError("Kayıt tamamlanamadı. E-posta kullanımda olabilir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Lerta Mail — Kayıt</h1>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Kurumsal posta için ayrı firma hesabı oluşturun.
        </p>
        {error ? <p className="auth-error">{error}</p> : null}
        <label htmlFor="company">Firma ünvanı</label>
        <input
          id="company"
          className="input"
          value={companyLegalName}
          onChange={(e) => setCompanyLegalName(e.target.value)}
          required
        />
        <label htmlFor="display">Yetkili adı</label>
        <input
          id="display"
          className="input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <label htmlFor="email">Giriş e-postası</label>
        <input
          id="email"
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password">Şifre (min. 8)</label>
        <input
          id="password"
          className="input"
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Kayıt…" : "Hesap oluştur"}
        </button>
        <p style={{ marginTop: 16, fontSize: "0.9rem" }}>
          <Link href="/login">Giriş yap</Link>
        </p>
      </form>
    </div>
  );
}
