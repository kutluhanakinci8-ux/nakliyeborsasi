"use client";

import { useMailLocale } from "@/lib/MailLocaleProvider";
import { useCallback, useEffect, useState } from "react";
import {
  fetchMailCryptoSettings,
  updateMailCryptoSettings,
  type MailCryptoSettings,
} from "@/lib/mailApi";
import { fingerprintPublicKey } from "@/lib/mailPgp";

type Props = {
  accessToken: string;
};

export function MailCryptoSettingsPanel({ accessToken }: Props) {
  const { t } = useMailLocale();
  const [settings, setSettings] = useState<MailCryptoSettings | null>(null);
  const [pgpKey, setPgpKey] = useState("");
  const [smimeCert, setSmimeCert] = useState("");
  const [smimeKey, setSmimeKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await fetchMailCryptoSettings(accessToken);
    setSettings(data.settings);
    setPgpKey(data.settings.pgpPublicKeyArmored ?? "");
    setSmimeCert("");
    setSmimeKey("");
  }, [accessToken]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await reload();
      } catch {
        setError(t("cryptoErrLoad"));
      } finally {
        setLoading(false);
      }
    })();
  }, [reload]);

  async function onSave() {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      let fingerprint: string | null = null;
      if (pgpKey.trim()) {
        fingerprint = await fingerprintPublicKey(pgpKey.trim());
      }
      const data = await updateMailCryptoSettings(accessToken, {
        pgpPublicKeyArmored: pgpKey.trim() || null,
        pgpKeyFingerprint: fingerprint,
        smimeCertificatePem: smimeCert.trim() || undefined,
        smimePrivateKeyPem: smimeKey.trim() || undefined,
        outboundSignSmime: settings?.outboundSignSmime,
        composePreferPgp: settings?.composePreferPgp,
      });
      setSettings(data.settings);
      setStatus(t("cryptoSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errGenericSave"));
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(
    field: "outboundSignSmime" | "composePreferPgp",
    value: boolean,
  ) {
    if (!settings) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await updateMailCryptoSettings(accessToken, {
        [field]: value,
      });
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errGenericUpdate"));
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

  return (
    <div className="mail-crypto-panel">
      <p className="mail-posta-intro">{t("cryptoIntro")}</p>
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

      <section className="mail-posta-card">
        <h3 className="mail-posta-card-title">{t("cryptoPgpTitle")}</h3>
        <p className="mail-posta-card-desc">{t("cryptoPgpDesc")}</p>
        <textarea
          className="mail-premium-field-input mail-crypto-key-area"
          value={pgpKey}
          onChange={(e) => setPgpKey(e.target.value)}
          placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----"
          rows={6}
        />
        <label className="mail-posta-toggle">
          <input
            type="checkbox"
            className="mail-posta-toggle-input"
            checked={settings?.composePreferPgp ?? false}
            disabled={busy || !pgpKey.trim()}
            onChange={(e) => void onToggle("composePreferPgp", e.target.checked)}
          />
          <span className="mail-posta-toggle-track" aria-hidden="true">
            <span className="mail-posta-toggle-thumb" />
          </span>
          <span className="mail-posta-toggle-text">
            <span className="mail-posta-toggle-label">{t("cryptoPreferPgp")}</span>
          </span>
        </label>
      </section>

      <section className="mail-posta-card">
        <h3 className="mail-posta-card-title">{t("cryptoSmimeTitle")}</h3>
        <p className="mail-posta-card-desc">{t("cryptoSmimeDesc")}</p>
        {settings?.hasSmimeCertificate ? (
          <p className="mail-security-status-text" role="status">
            {t("cryptoCertStored")}
            {settings.hasSmimePrivateKey ? t("cryptoPrivateKeyStored") : ""}.
          </p>
        ) : null}
        <label className="mail-premium-field">
          <span className="mail-premium-field-label">{t("cryptoCertPemLabel")}</span>
          <textarea
            className="mail-premium-field-input mail-crypto-key-area"
            value={smimeCert}
            onChange={(e) => setSmimeCert(e.target.value)}
            rows={4}
          />
        </label>
        <label className="mail-premium-field">
          <span className="mail-premium-field-label">{t("cryptoPrivatePemLabel")}</span>
          <textarea
            className="mail-premium-field-input mail-crypto-key-area"
            value={smimeKey}
            onChange={(e) => setSmimeKey(e.target.value)}
            rows={4}
          />
        </label>
        <label className="mail-posta-toggle">
          <input
            type="checkbox"
            className="mail-posta-toggle-input"
            checked={settings?.outboundSignSmime ?? false}
            disabled={
              busy ||
              !(settings?.hasSmimeCertificate && settings?.hasSmimePrivateKey) &&
              !smimeKey.trim()
            }
            onChange={(e) => void onToggle("outboundSignSmime", e.target.checked)}
          />
          <span className="mail-posta-toggle-track" aria-hidden="true">
            <span className="mail-posta-toggle-thumb" />
          </span>
          <span className="mail-posta-toggle-text">
            <span className="mail-posta-toggle-label">{t("cryptoSignOutbound")}</span>
          </span>
        </label>
      </section>

      <button
        type="button"
        className="mail-premium-btn mail-premium-btn--primary"
        disabled={busy}
        onClick={() => void onSave()}
      >
        {busy ? t("actionSaving") : t("cryptoSaveKeys")}
      </button>
    </div>
  );
}
