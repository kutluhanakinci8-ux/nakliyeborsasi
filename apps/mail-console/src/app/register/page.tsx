"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MAIL_WEB_URL } from "@/lib/apiConfig";
import { quickStartPilotMailbox, registerMailSaas } from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

const MAIL_PLAN_CODES = new Set([
  "lerta_mail_pilot_tr",
  "lerta_mail_corporate_tr",
]);

export default function RegisterPage() {
  const router = useRouter();
  const { setAccessToken } = useConsoleSession();
  const [subscriptionPlanCode, setSubscriptionPlanCode] = useState(
    "lerta_mail_pilot_tr",
  );
  const [pilotSlug, setPilotSlug] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("plan")?.trim();
    if (fromQuery && MAIL_PLAN_CODES.has(fromQuery)) {
      setSubscriptionPlanCode(fromQuery);
    }
    const slug = params.get("slug")?.trim().toLowerCase() ?? "";
    if (slug) {
      setPilotSlug(slug);
    }
  }, []);
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
        subscriptionPlanCode,
      });
      setAccessToken(token);
      if (subscriptionPlanCode === "lerta_mail_pilot_tr") {
        try {
          const quick = await quickStartPilotMailbox(token, {
            companyLegalName: companyLegalName.trim(),
            displayName: displayName.trim() || companyLegalName.trim(),
            localPart: pilotSlug.trim() || undefined,
          });
          const handoff = `${MAIL_WEB_URL.replace(/\/$/, "")}/auth/consume#access_token=${encodeURIComponent(token)}&from=${encodeURIComponent(quick.fromAddress)}`;
          window.location.href = handoff;
          return;
        } catch {
          router.replace("/dashboard?pilot=dns_pending");
          return;
        }
      }
      router.replace(
        `/domain?welcome=1&plan=${encodeURIComponent(subscriptionPlanCode)}`,
      );
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
          {subscriptionPlanCode === "lerta_mail_corporate_tr"
            ? "Kayıt sonrası özel domain sihirbazına yönlendirileceksiniz."
            : "Pilot: 1 kutu, 80 gönderim/saat — kayıt sonrası adresiniz açılır ve webmail’e yönlendirilir."}
        </p>
        {subscriptionPlanCode === "lerta_mail_pilot_tr" ? (
          <>
            <label htmlFor="slug">Pilot adres (isteğe bağlı)</label>
            <input
              id="slug"
              className="input"
              placeholder="ornek-firma"
              value={pilotSlug}
              onChange={(e) => setPilotSlug(e.target.value)}
              pattern="[a-z0-9][a-z0-9-]{1,48}[a-z0-9]"
            />
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 0 }}>
              Boş bırakırsanız firma adından otomatik üretilir (@lerta.com.tr).
            </p>
          </>
        ) : null}
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
