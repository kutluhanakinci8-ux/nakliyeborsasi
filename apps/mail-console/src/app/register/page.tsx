"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MAIL_WEB_URL } from "@/lib/apiConfig";
import {
  parseLertaPostDesiredAddress,
  suggestLertaPostFromCompany,
} from "@/lib/lertaPostAddress";
import {
  claimMailAddress,
  quickStartPilotMailbox,
  registerMailSaas,
} from "@/lib/consoleApi";
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
  const [postaDesired, setPostaDesired] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("plan")?.trim();
    if (fromQuery && MAIL_PLAN_CODES.has(fromQuery)) {
      setSubscriptionPlanCode(fromQuery);
    }
    const slug = params.get("slug")?.trim().toLowerCase() ?? "";
    if (slug) {
      setPostaDesired(slug.includes("@") ? slug : `info@${slug}.post`);
    }
  }, []);
  const [companyLegalName, setCompanyLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const parsedPost = useMemo(
    () => parseLertaPostDesiredAddress(postaDesired),
    [postaDesired],
  );
  const suggestedFromCompany = useMemo(
    () => suggestLertaPostFromCompany(companyLegalName, "info"),
    [companyLegalName],
  );

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
        const desired =
          parseLertaPostDesiredAddress(postaDesired)?.full ??
          suggestLertaPostFromCompany(companyLegalName, "info");
        if (desired) {
          try {
            const claim = await claimMailAddress(token, desired, {
              displayName: displayName.trim() || companyLegalName.trim(),
            });
            const show =
              claim.vanityAddress ?? claim.fromAddress ?? desired;
            const handoff = `${MAIL_WEB_URL.replace(/\/$/, "")}/auth/consume#access_token=${encodeURIComponent(token)}&from=${encodeURIComponent(show)}`;
            window.location.href = handoff;
            return;
          } catch {
            setError(
              "Lerta Posta adresi açılamadı. Format: info@firmaniz.post (küçük harf).",
            );
            setLoading(false);
            return;
          }
        }
        try {
          const quick = await quickStartPilotMailbox(token, {
            companyLegalName: companyLegalName.trim(),
            displayName: displayName.trim() || companyLegalName.trim(),
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
        <h1>Lerta Posta — Kayıt</h1>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          {subscriptionPlanCode === "lerta_mail_corporate_tr"
            ? "Kayıt sonrası özel domain sihirbazına yönlendirileceksiniz."
            : "1 kutu, 80 gönderim/saat. Kayıt sonrası Lerta Posta adresiniz açılır ve webmail’e yönlendirilir."}
        </p>
        {subscriptionPlanCode === "lerta_mail_pilot_tr" ? (
          <>
            <label htmlFor="posta">Lerta Posta adresiniz</label>
            <input
              id="posta"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="info@firmaniz.post"
              value={postaDesired}
              onChange={(e) => setPostaDesired(e.target.value.trim().toLowerCase())}
            />
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--muted)",
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              <p style={{ margin: "0 0 8px" }}>
                Nasıl yazılır: <strong>ön ek</strong> + <strong>@</strong> +{" "}
                <strong>firma adı</strong> + <strong>.post</strong>
              </p>
              <p
                style={{
                  margin: "0 0 8px",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "0.8rem",
                }}
              >
                [ info | adiniz | satis ] @ [ kutluhan | abayer ] .post
              </p>
              <p style={{ margin: 0 }}>
                Örnekler: <strong>info@kutluhan.post</strong>,{" "}
                <strong>abayer@abayer.post</strong>,{" "}
                <strong>satis@abayer.post</strong>
              </p>
            </div>
            {parsedPost ? (
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--success)",
                  fontWeight: 600,
                  marginBottom: 0,
                }}
              >
                Açılacak kutu: {parsedPost.full}
              </p>
            ) : postaDesired.trim() ? (
              <p className="auth-error" style={{ fontSize: "0.85rem" }}>
                Geçerli format: küçük harf, ör. info@firmaniz.post
              </p>
            ) : suggestedFromCompany ? (
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 0 }}>
                Boş bırakırsanız öneri:{" "}
                <button
                  type="button"
                  className="btn secondary"
                  style={{ padding: "2px 8px", fontSize: "0.8rem", marginLeft: 4 }}
                  onClick={() => setPostaDesired(suggestedFromCompany)}
                >
                  {suggestedFromCompany}
                </button>
              </p>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 0 }}>
                Firma ünvanını yazdıktan sonra size uygun bir .post adresi önerilir.
              </p>
            )}
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
        <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "4px 0 8px" }}>
          Panele giriş için (ör. sizin Gmail veya kurumsal adresiniz); Lerta Posta
          kutusu yukarıdaki <code>.post</code> adresidir.
        </p>
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
