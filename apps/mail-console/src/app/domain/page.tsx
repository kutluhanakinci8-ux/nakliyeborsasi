"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  claimMailAddress,
  CustomDomainBundle,
  fetchCustomDomainBundle,
  isPlatformOperator,
  registerCustomDomain,
  verifyCustomDomainDns,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

export default function DomainPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [bundle, setBundle] = useState<CustomDomainBundle | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [desiredAddress, setDesiredAddress] = useState("");
  const [localPart, setLocalPart] = useState("info");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcomePlan, setWelcomePlan] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const data = await fetchCustomDomainBundle(accessToken);
    setBundle(data);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      setOperator(await isPlatformOperator(accessToken));
      await refresh();
    })();
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      setWelcomePlan(params.get("plan"));
    }
  }, [accessToken, refresh, router]);

  async function onClaimAddress(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await claimMailAddress(
        accessToken,
        desiredAddress.trim().toLowerCase(),
      );
      if (result.bundle) {
        setBundle(result.bundle);
      } else {
        await refresh();
      }
      setMessage(
        `${result.vanityAddress ?? result.fromAddress} — ${result.nextStepTr}`,
      );
    } catch {
      setError(
        "Adres hazırlanamadı. Formatı kontrol edin veya paketiniz özel domain içeriyor mu bakın.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await registerCustomDomain(accessToken, domainInput.trim());
      setBundle(data);
      setMessage("Domain kaydedildi. DNS kayıtlarını ekleyin.");
    } catch {
      setError("Domain eklenemedi. Alan adını kontrol edin.");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    if (!accessToken) {
      return;
    }
    setError("");
    setLoading(true);
    try {
      await verifyCustomDomainDns(accessToken);
      setMessage("DNS doğrulandı.");
      await refresh();
    } catch {
      setError("DNS henüz hazır değil. Kayıtları kontrol edip tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  async function onProvision(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !bundle?.mailDomain) {
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await claimMailAddress(
        accessToken,
        `${localPart.trim().toLowerCase()}@${bundle.mailDomain.domain}`,
      );
      setMessage(`Kutu hazır: ${result.fromAddress}`);
      await refresh();
    } catch {
      setError("Kutu oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  }

  if (!accessToken) {
    return null;
  }

  const instructions = bundle?.dnsInstructions;
  const status = bundle?.mailDomain?.verificationStatus ?? "—";
  const dnsReady = bundle?.dnsCheck?.ok === true;

  return (
    <ConsoleShell operator={operator}>
      <h1 style={{ marginTop: 0 }}>Lerta Posta — adresinizi seçin</h1>
      {welcomePlan === "lerta_mail_corporate_tr" ? (
        <div className="card" style={{ marginBottom: 16, borderColor: "var(--accent)" }}>
          <h2 style={{ marginTop: 0 }}>Hoş geldiniz</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            İstediğiniz adresi yazın (ör. <strong>info@abayer.post</strong>). Lerta Post
            ile DNS ve teknik kurulum arka planda tamamlanır; siz webmail ile kullanmaya
            başlarsınız.
          </p>
        </div>
      ) : null}
      <p style={{ color: "var(--muted)" }}>
        <strong>Lerta Post:</strong> ön eki siz seçin, firma adınız <code>.post</code> ile
        biter (info, satis, destek…). Kendi alan adınız için{" "}
        <code>info@firma.com.tr</code> yazın.
      </p>
      {message ? (
        <p style={{ color: "var(--success)", fontWeight: 600 }}>{message}</p>
      ) : null}
      {error ? <p className="auth-error">{error}</p> : null}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>İstediğiniz posta adresi</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Tek satırda yazın. <strong>@firma.post</strong> → Lerta Posta (DNS otomatik);
          <strong>@firma.com.tr</strong> → müşteri DNS; <strong>@lerta.com.tr</strong> → paylaşımlı pilot.
        </p>
        <form onSubmit={onClaimAddress}>
          <input
            className="input"
            type="email"
            placeholder="info@abayer.post veya karagoz@lerta.com.tr"
            value={desiredAddress}
            onChange={(e) => setDesiredAddress(e.target.value)}
            required
            style={{ maxWidth: 360 }}
          />
          <button className="btn" type="submit" disabled={loading}>
            Hazırla
          </button>
        </form>
      </div>

      {!bundle?.mailDomain ? (
        <div className="card">
          <h2>Alternatif: yalnızca alan adı</h2>
          <form onSubmit={onRegister}>
            <input
              className="input"
              placeholder="firma.com.tr"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              required
            />
            <button className="btn secondary" type="submit" disabled={loading}>
              Kaydet
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>
              {bundle.mailDomain.domain}{" "}
              <span
                className={`badge ${
                  dnsReady
                    ? "ok"
                    : status === "failed"
                      ? "fail"
                      : "pending"
                }`}
              >
                {dnsReady ? "teslimat hazır" : status}
              </span>
            </h2>
            {bundle.dnsCheck ? (
              <p>
                MX: {bundle.dnsCheck.mx?.ok ? "✓" : "✗"} · SPF:{" "}
                {bundle.dnsCheck.spf.ok ? "✓" : "✗"} · DKIM:{" "}
                {bundle.dnsCheck.dkim.ok ? "✓" : "✗"}
              </p>
            ) : null}
            {!dnsReady ? (
              <p style={{ color: "var(--muted)" }}>
                «verified» yalnızca sahiplik içindir; Gmail/Outlook için üç kayıt
                da yeşil olmalı.
              </p>
            ) : null}
            <button
              className="btn secondary"
              type="button"
              disabled={loading}
              onClick={() => void onVerify()}
            >
              DNS doğrula
            </button>
          </div>

          {instructions ? (
            <div className="card">
              <h2>DNS kayıtları (isimtescil)</h2>
              <div className="dns-row">
                <span>MX</span>
                <code>
                  @ → {instructions.mxPriority ?? 10}{" "}
                  {instructions.mxHost ?? "mail.lerta.com.tr"}
                </code>
              </div>
              <div className="dns-row">
                <span>TXT SPF</span>
                <code>{instructions.spfHost} → {instructions.spfValue}</code>
              </div>
              <div className="dns-row">
                <span>TXT DKIM</span>
                <code>
                  {instructions.dkimHost} → {instructions.dkimTxt}
                </code>
              </div>
              <div className="dns-row">
                <span>TXT DMARC</span>
                <code>
                  {instructions.dmarcHost} → {instructions.dmarcValue}
                </code>
              </div>
            </div>
          ) : null}

          <div className="card">
            <h2>Ek posta adresi</h2>
            <p>Mevcut: <strong>{bundle.fromAddress ?? "—"}</strong></p>
            <form onSubmit={onProvision}>
              <input
                className="input"
                placeholder="info"
                value={localPart}
                onChange={(e) => setLocalPart(e.target.value)}
                required
              />
              <button className="btn secondary" type="submit" disabled={loading}>
                @{bundle.mailDomain.domain} oluştur
              </button>
            </form>
            <p style={{ marginTop: 12 }}>
              <Link className="btn secondary" href="/mailboxes">
                Tüm kutuları yönet
              </Link>
            </p>
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Pilot adres (isteğe bağlı)</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Özel domain olmadan hemen denemek için{" "}
          <strong>karagoz@lerta.com.tr</strong> gibi bir adres yazın veya
          özetten pilot kutu açın.
        </p>
        <Link className="btn secondary" href="/dashboard">
          Pilot kutuya geç
        </Link>
      </div>
    </ConsoleShell>
  );
}
