"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchMailInboxBranding,
  updateMailInboxBranding,
  type MailInboxBranding,
} from "@/lib/mailApi";
import { resolveMailConsoleUrl } from "@/lib/mailApi";

type Props = {
  accessToken: string;
  canEdit: boolean;
  onBrandingSaved?: (branding: MailInboxBranding) => void;
};

export function MailTenantBrandingPanel({
  accessToken,
  canEdit,
  onBrandingSaved,
}: Props) {
  const [branding, setBranding] = useState<MailInboxBranding | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [emailBrandTitle, setEmailBrandTitle] = useState("");
  const [emailAccentColor, setEmailAccentColor] = useState("#1a1647");
  const [emailLegalFooter, setEmailLegalFooter] = useState("");
  const [defaultFromDisplayName, setDefaultFromDisplayName] = useState("");
  const [hidePlatformEmailChrome, setHidePlatformEmailChrome] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchMailInboxBranding(accessToken);
      setBranding(data.branding);
      setLogoUrl(data.branding.logoUrl ?? "");
      setEmailBrandTitle(data.branding.emailBrandTitle ?? "");
      setEmailAccentColor(data.branding.emailAccentColor ?? "#1a1647");
      setEmailLegalFooter(data.branding.emailLegalFooter ?? "");
      setDefaultFromDisplayName(data.branding.defaultFromDisplayName ?? "");
      setHidePlatformEmailChrome(data.branding.hidePlatformEmailChrome ?? false);
    } catch {
      setError("Marka ayarları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onSave() {
    if (!canEdit || !branding?.allowed) {
      return;
    }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const data = await updateMailInboxBranding(accessToken, {
        logoUrl: logoUrl.trim() || null,
        emailBrandTitle: emailBrandTitle.trim() || null,
        emailAccentColor: emailAccentColor.trim() || null,
        emailLegalFooter: emailLegalFooter.trim() || null,
        defaultFromDisplayName: defaultFromDisplayName.trim() || null,
        hidePlatformEmailChrome: branding.fullWhiteLabel
          ? hidePlatformEmailChrome
          : false,
      });
      setBranding(data.branding);
      onBrandingSaved?.(data.branding);
      setStatus("Kurumsal kimlik kaydedildi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mail-posta-skeleton" aria-busy="true">
        <div className="mail-posta-skeleton-card" />
      </div>
    );
  }

  if (!branding?.allowed) {
    return (
      <p className="mail-accounts-muted">
        {branding?.detailTr ?? "Marka ayarları bu planda kapalı."}{" "}
        <a href={resolveMailConsoleUrl("/upgrade")} target="_blank" rel="noreferrer">
          Plan yükseltme
        </a>
      </p>
    );
  }

  return (
    <div className="mail-tenant-branding-form">
      {error ? (
        <p className="mail-accounts-status mail-accounts-status--err" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="mail-accounts-status mail-accounts-status--ok" role="status">
          {status}
        </p>
      ) : null}

      <label className="mail-premium-field">
        <span className="mail-premium-field-label">Logo URL (HTTPS)</span>
        <input
          className="mail-premium-field-input"
          value={logoUrl}
          disabled={!canEdit}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://firma.com/logo.png"
        />
      </label>
      <label className="mail-premium-field">
        <span className="mail-premium-field-label">Marka adı (e-posta üst bilgi)</span>
        <input
          className="mail-premium-field-input"
          value={emailBrandTitle}
          disabled={!canEdit}
          onChange={(e) => setEmailBrandTitle(e.target.value)}
          maxLength={120}
        />
      </label>
      <label className="mail-premium-field">
        <span className="mail-premium-field-label">Marka rengi</span>
        <input
          className="mail-premium-field-input"
          type="color"
          value={emailAccentColor.startsWith("#") ? emailAccentColor : "#1a1647"}
          disabled={!canEdit}
          onChange={(e) => setEmailAccentColor(e.target.value)}
        />
      </label>
      <label className="mail-premium-field">
        <span className="mail-premium-field-label">Varsayılan gönderen adı</span>
        <input
          className="mail-premium-field-input"
          value={defaultFromDisplayName}
          disabled={!canEdit}
          onChange={(e) => setDefaultFromDisplayName(e.target.value)}
          maxLength={120}
        />
      </label>
      <label className="mail-premium-field">
        <span className="mail-premium-field-label">Yasal dipnot (giden posta)</span>
        <textarea
          className="mail-premium-field-input mail-tenant-branding-legal"
          value={emailLegalFooter}
          disabled={!canEdit}
          onChange={(e) => setEmailLegalFooter(e.target.value)}
          maxLength={500}
          rows={3}
        />
      </label>

      {branding.fullWhiteLabel ? (
        <label className="mail-posta-toggle">
          <input
            type="checkbox"
            className="mail-posta-toggle-input"
            checked={hidePlatformEmailChrome}
            disabled={!canEdit}
            onChange={(e) => setHidePlatformEmailChrome(e.target.checked)}
          />
          <span className="mail-posta-toggle-track" aria-hidden="true">
            <span className="mail-posta-toggle-thumb" />
          </span>
          <span className="mail-posta-toggle-text">
            <span className="mail-posta-toggle-label">Lerta platform chrome gizle</span>
            <span className="mail-posta-toggle-hint">
              Giden HTML şablonda üst/alt Lerta markası kaldırılır.
            </span>
          </span>
        </label>
      ) : (
        <p className="mail-accounts-muted">
          Tam white-label (platform chrome gizleme) Enterprise planda açılır.
        </p>
      )}

      {canEdit ? (
        <button
          type="button"
          className="mail-premium-btn mail-premium-btn--primary"
          disabled={busy}
          onClick={() => void onSave()}
        >
          {busy ? "Kaydediliyor…" : "Markayı kaydet"}
        </button>
      ) : null}
    </div>
  );
}
