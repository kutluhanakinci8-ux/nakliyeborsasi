"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPasswordWithToken } from "@/lib/consoleApi";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setError("Geçersiz bağlantı.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await resetPasswordWithToken(token, password);
      setDone(true);
    } catch {
      setError("Şifre güncellenemedi. Bağlantı süresi dolmuş olabilir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={onSubmit}>
      <h1>Yeni şifre</h1>
      {done ? (
        <p>
          Şifreniz güncellendi.{" "}
          <Link href="/login">Giriş yapın</Link>.
        </p>
      ) : (
        <>
          {error ? <p className="auth-error">{error}</p> : null}
          <label htmlFor="password">Yeni şifre (min. 8)</label>
          <input
            id="password"
            className="input"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="btn" type="submit" disabled={loading || !token}>
            Kaydet
          </button>
        </>
      )}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <Suspense fallback={<div className="auth-card">Yükleniyor…</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
