"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConsoleShell } from "@/components/ConsoleShell";
import {
  fetchMailBranding,
  isPlatformOperator,
  updateMailBranding,
  type MailBrandingSnapshot,
} from "@/lib/consoleApi";
import { useConsoleSession } from "@/lib/session";

export default function BrandingPage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();
  const [operator, setOperator] = useState(false);
  const [branding, setBranding] = useState<MailBrandingSnapshot | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [emailBrandTitle, setEmailBrandTitle] = useState("");
  const [defaultFromDisplayName, setDefaultFromDisplayName] = useState("");
  const [hidePlatformEmailChrome, setHidePlatformEmailChrome] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void (async () => {
      setOperator(await isPlatformOperator(accessToken));
      try {
        const data = await fetchMailBranding(accessToken);
        setBranding(data.branding);
        setLogoUrl(data.branding.logoUrl ?? "");
        setEmailBrandTitle(data.branding.emailBrandTitle ?? "");
        setDefaultFromDisplayName(data.branding.defaultFromDisplayName ?? "");
        setHidePlatformEmailChrome(data.branding.hidePlatformEmailChrome);
      } catch {
        setError("Marka ayarları yüklenemedi.");
      }
    })();
  }, [accessToken, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !branding?.allowed) {
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const data = await updateMailBranding(accessToken, {
        logoUrl: logoUrl.trim() || null,
        emailBrandTitle: emailBrandTitle.trim() || null,
        defaultFromDisplayName: defaultFromDisplayName.trim() || null,
        hidePlatformEmailChrome,
      });
      setBranding(data.branding);
      setMessage("Kaydedildi.");
    } catch {
      setError("Kaydedilemedi. Logo https olmalı ve plan Enterprise olmalı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ConsoleShell operator={operator}>
      <h1>White-label (Enterprise)</h1>
      <p style={{ color: "var(--muted)", maxWidth: 560 }}>
        Bildirim e-postalarında logo, üst bilgi marka adı ve varsayılan From
        görünen adı. Plan: <code>lerta_mail_enterprise_tr</code>.
      </p>
      {branding && !branding.allowed ? (
        <div className="card" style={{ marginTop: 16 }}>
          <p style={{ margin: 0 }}>{branding.detailTr}</p>
          <p style={{ margin: "12px 0 0" }}>
            <Link href="/upgrade">Plan yükseltme</Link>
          </p>
        </div>
      ) : null}
      {branding?.allowed ? (
        <form className="card" style={{ marginTop: 16 }} onSubmit={onSubmit}>
          <label style={{ display: "block", marginBottom: 12 }}>
            Logo URL (https)
            <input
              className="input"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://firma.com/logo.png"
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 12 }}>
            E-posta marka adı
            <input
              className="input"
              value={emailBrandTitle}
              onChange={(e) => setEmailBrandTitle(e.target.value)}
              maxLength={120}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 12 }}>
            Varsayılan From görünen adı
            <input
              className="input"
              value={defaultFromDisplayName}
              onChange={(e) => setDefaultFromDisplayName(e.target.value)}
              maxLength={120}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <input
              type="checkbox"
              checked={hidePlatformEmailChrome}
              onChange={(e) => setHidePlatformEmailChrome(e.target.checked)}
            />
            Lerta e-posta üst/alt şablonunu gizle
          </label>
          {error ? (
            <p style={{ color: "#b91c1c", margin: "0 0 8px" }}>{error}</p>
          ) : null}
          {message ? (
            <p style={{ color: "var(--success)", margin: "0 0 8px" }}>
              {message}
            </p>
          ) : null}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </form>
      ) : null}
      <p style={{ marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
        <code>docs/MAIL_WHITE_LABEL_ENTERPRISE.md</code>
      </p>
    </ConsoleShell>
  );
}
