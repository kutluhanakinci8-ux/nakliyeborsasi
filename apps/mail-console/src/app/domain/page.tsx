"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  CustomDomainBundle,
  fetchCustomDomainBundle,
  isPlatformOperator,
  provisionCustomMailbox,
  registerCustomDomain,
  verifyCustomDomainDns,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

const MTA_HOST = "mail.lerta.com.tr";

export default function DomainPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [bundle, setBundle] = useState<CustomDomainBundle | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [localPart, setLocalPart] = useState("info");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
  }, [accessToken, refresh, router]);

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
    if (!accessToken) {
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await provisionCustomMailbox(
        accessToken,
        localPart.trim().toLowerCase(),
      );
      setMessage(`Kutu hazır: ${result.fromAddress}`);
      await refresh();
    } catch {
      setError("Kutu oluşturulamadı. Domain doğrulandı mı?");
    } finally {
      setLoading(false);
    }
  }

  if (!accessToken) {
    return null;
  }

  const instructions = bundle?.dnsInstructions;
  const status = bundle?.mailDomain?.verificationStatus ?? "—";

  return (
    <ConsoleShell operator={operator}>
      <h1 style={{ marginTop: 0 }}>Özel domain</h1>
      <p style={{ color: "var(--muted)" }}>
        Müşterileriniz sizin alan adınızdan mail alır (ör. info@firma.com.tr).
      </p>
      {message ? (
        <p style={{ color: "var(--success)", fontWeight: 600 }}>{message}</p>
      ) : null}
      {error ? <p className="auth-error">{error}</p> : null}

      {!bundle?.mailDomain ? (
        <div className="card">
          <h2>1. Alan adı ekle</h2>
          <form onSubmit={onRegister}>
            <input
              className="input"
              placeholder="firma.com.tr"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              required
            />
            <button className="btn" type="submit" disabled={loading}>
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
                  status === "verified"
                    ? "ok"
                    : status === "failed"
                      ? "fail"
                      : "pending"
                }`}
              >
                {status}
              </span>
            </h2>
            {bundle.dnsCheck ? (
              <p>
                SPF: {bundle.dnsCheck.spf.ok ? "✓" : "✗"} · DKIM:{" "}
                {bundle.dnsCheck.dkim.ok ? "✓" : "✗"}
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
              <h2>2. DNS kayıtları (isimtescil)</h2>
              <div className="dns-row">
                <span>MX</span>
                <code>
                  @ → 10 {MTA_HOST}
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
            <h2>3. İlk posta adresi</h2>
            <p>Mevcut: <strong>{bundle.fromAddress ?? "—"}</strong></p>
            <form onSubmit={onProvision}>
              <input
                className="input"
                placeholder="info"
                value={localPart}
                onChange={(e) => setLocalPart(e.target.value)}
                required
              />
              <button
                className="btn"
                type="submit"
                disabled={loading || status !== "verified"}
              >
                @{bundle.mailDomain.domain} oluştur
              </button>
            </form>
          </div>
        </>
      )}
    </ConsoleShell>
  );
}
