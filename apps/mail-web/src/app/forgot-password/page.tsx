"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset } from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";

export default function ForgotPasswordPage() {
  const { t } = useMailLocale();
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
      setError(t("forgotPasswordErr"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>{t("forgotPasswordTitle")}</h1>
        {sent ? (
          <p>{t("forgotPasswordSent")}</p>
        ) : (
          <>
            {error ? <p className="login-error">{error}</p> : null}
            <label htmlFor="email">{t("forgotPasswordEmail")}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {t("forgotPasswordSubmit")}
            </button>
          </>
        )}
        <p style={{ marginTop: 16 }}>
          <Link href="/login">{t("forgotPasswordBackLogin")}</Link>
        </p>
      </form>
    </div>
  );
}
