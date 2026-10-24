"use client";

import { useCallback, useEffect, useState } from "react";
import {
  beginTotpSetup,
  confirmTotpSetup,
  fetchTotpStatus,
  resolveMailConsoleUrl,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  onTotpEnabledChange?: (enabled: boolean) => void;
};

async function copySecret(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function MailSecuritySettingsPanel({
  accessToken,
  onTotpEnabledChange,
}: Props) {
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [copyHint, setCopyHint] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  const reload = useCallback(async () => {
    const totp = await fetchTotpStatus(accessToken);
    setTotpEnabled(totp.status.enabled);
    onTotpEnabledChange?.(totp.status.enabled);
  }, [accessToken, onTotpEnabledChange]);

  useEffect(() => {
    void (async () => {
      setInitialLoading(true);
      setError("");
      try {
        await reload();
      } catch {
        setError("Güvenlik ayarları yüklenemedi.");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [reload]);

  async function onBeginSetup() {
    setSetupBusy(true);
    setError("");
    setStatus("");
    try {
      const data = await beginTotpSetup(accessToken);
      setTotpSecret(data.setup.secret);
      setTotpCode("");
      setStatus("Authenticator uygulamasına secret ekleyin, sonra 6 haneli kodu girin.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "TOTP kurulumu başlatılamadı.");
    } finally {
      setSetupBusy(false);
    }
  }

  async function onConfirmSetup() {
    if (!totpCode.trim() || totpCode.trim().length < 6) {
      setError("6 haneli doğrulama kodu gerekli.");
      return;
    }
    setConfirmBusy(true);
    setError("");
    try {
      await confirmTotpSetup(accessToken, totpCode.trim());
      setTotpSecret(null);
      setTotpCode("");
      setTotpEnabled(true);
      onTotpEnabledChange?.(true);
      setStatus("İki adımlı doğrulama (TOTP) etkinleştirildi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kod doğrulanamadı.");
    } finally {
      setConfirmBusy(false);
    }
  }

  const consoleSecurityUrl = resolveMailConsoleUrl();

  if (initialLoading) {
    return (
      <div className="mail-security-panel mail-security-panel--premium">
        <div className="mail-posta-skeleton" aria-busy="true">
          <div className="mail-posta-skeleton-line mail-posta-skeleton-line--lead" />
          <div className="mail-posta-skeleton-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="mail-security-panel mail-security-panel--premium">
      <p className="mail-posta-intro">
        Hesabınızı Authenticator uygulaması ile koruyun. TOTP açıkken giriş ve
        hassas işlemler için ek kod gerekir. Kapatmak yalnızca yönetim konsolu
        güvenlik sayfasından yapılır.
      </p>

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
      {copyHint ? (
        <p className="mail-accounts-status mail-accounts-status--ok" role="status">
          {copyHint}
        </p>
      ) : null}

      <section className="mail-posta-card">
        <header className="mail-posta-card-head mail-security-card-head">
          <div>
            <h3 className="mail-posta-card-title">İki adımlı doğrulama (TOTP)</h3>
            <p className="mail-posta-card-desc">
              Google Authenticator, Microsoft Authenticator veya uyumlu uygulama.
            </p>
          </div>
          <span
            className={
              totpEnabled
                ? "mail-security-pill mail-security-pill--on"
                : "mail-security-pill mail-security-pill--off"
            }
          >
            {totpEnabled ? "Açık" : "Kapalı"}
          </span>
        </header>

        {totpEnabled ? (
          <p className="mail-security-status-text" role="status">
            TOTP etkin. Yeni cihazda giriş için uygulamadaki kodu kullanın.
          </p>
        ) : totpSecret ? (
          <div className="mail-security-setup">
            <p className="mail-security-setup-label">Kurulum secret (tek sefer)</p>
            <code className="mail-security-secret">{totpSecret}</code>
            <div className="mail-security-setup-actions">
              <button
                type="button"
                className="mail-premium-btn mail-premium-btn--ghost"
                onClick={() =>
                  void (async () => {
                    const ok = await copySecret(totpSecret);
                    setCopyHint(ok ? "Secret kopyalandı." : "Kopyalanamadı.");
                    window.setTimeout(() => setCopyHint(""), 2500);
                  })()
                }
              >
                Secret kopyala
              </button>
            </div>
            <label className="mail-premium-field">
              <span className="mail-premium-field-label">Doğrulama kodu</span>
              <input
                className="mail-premium-field-input mail-security-code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6 haneli kod"
                maxLength={8}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\s/g, ""))}
              />
            </label>
            <div className="mail-security-primary-actions">
              <button
                type="button"
                className="mail-premium-btn mail-premium-btn--primary"
                disabled={confirmBusy}
                onClick={() => void onConfirmSetup()}
              >
                {confirmBusy ? "Doğrulanıyor…" : "Etkinleştir"}
              </button>
              <button
                type="button"
                className="mail-premium-btn mail-premium-btn--ghost"
                disabled={confirmBusy}
                onClick={() => {
                  setTotpSecret(null);
                  setTotpCode("");
                  setStatus("");
                }}
              >
                İptal
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mail-security-status-text">
              TOTP kapalı. Kuruluma başlamak için düğmeyi kullanın.
            </p>
            <div className="mail-security-primary-actions">
              <button
                type="button"
                className="mail-premium-btn mail-premium-btn--primary"
                disabled={setupBusy}
                onClick={() => void onBeginSetup()}
              >
                {setupBusy ? "Hazırlanıyor…" : "TOTP kur"}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="mail-posta-card mail-posta-card--muted">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">TOTP kapatma</h3>
          <p className="mail-posta-card-desc">
            Güvenlik politikası gereği webmailden kapatılamaz; yönetim konsolu
            gerekir.
          </p>
        </header>
        <a
          className="mail-privacy-console-link"
          href={consoleSecurityUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Yönetim konsolu — güvenlik →
        </a>
      </section>
    </div>
  );
}
