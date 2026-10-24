"use client";

import { useCallback, useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import {
  beginTotpSetup,
  confirmTotpSetup,
  deleteWebAuthnCredential,
  fetchInboxPreferences,
  fetchTotpStatus,
  fetchWebAuthnCredentials,
  fetchWebAuthnRegisterOptions,
  resolveMailConsoleUrl,
  updateInboxPreferences,
  verifyWebAuthnRegistration,
  type WebAuthnCredentialSummary,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  onTotpEnabledChange?: (enabled: boolean) => void;
  onAppLockChange?: (enabled: boolean) => void;
  onPasskeysChange?: (hasPasskeys: boolean) => void;
};

async function copySecret(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function passkeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

export function MailSecuritySettingsPanel({
  accessToken,
  onTotpEnabledChange,
  onAppLockChange,
  onPasskeysChange,
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

  const [passkeys, setPasskeys] = useState<WebAuthnCredentialSummary[]>([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyDeviceName, setPasskeyDeviceName] = useState("");
  const [mailAppLockEnabled, setMailAppLockEnabled] = useState(false);
  const [appLockBusy, setAppLockBusy] = useState(false);

  const reloadPasskeys = useCallback(async () => {
    const data = await fetchWebAuthnCredentials(accessToken);
    setPasskeys(data.credentials);
    onPasskeysChange?.(data.hasPasskeys);
    return data.hasPasskeys;
  }, [accessToken, onPasskeysChange]);

  const reload = useCallback(async () => {
    const totp = await fetchTotpStatus(accessToken);
    setTotpEnabled(totp.status.enabled);
    onTotpEnabledChange?.(totp.status.enabled);
    await reloadPasskeys();
    const prefs = await fetchInboxPreferences(accessToken);
    setMailAppLockEnabled(prefs.preferences.mailAppLockEnabled ?? false);
    onAppLockChange?.(prefs.preferences.mailAppLockEnabled ?? false);
  }, [accessToken, onTotpEnabledChange, onAppLockChange, reloadPasskeys]);

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

  async function onAddPasskey() {
    if (!passkeySupported()) {
      setError(
        "Passkey bu tarayıcıda desteklenmiyor. HTTPS ve güncel Chrome/Safari/Edge kullanın.",
      );
      return;
    }
    setPasskeyBusy(true);
    setError("");
    setStatus("");
    try {
      const name = passkeyDeviceName.trim() || undefined;
      const { options } = await fetchWebAuthnRegisterOptions(accessToken, name);
      const attestation = await startRegistration({ optionsJSON: options });
      await verifyWebAuthnRegistration(accessToken, attestation, name);
      setPasskeyDeviceName("");
      await reloadPasskeys();
      setStatus("Passkey kaydedildi. Face ID / Touch ID ile kilidi açabilirsiniz.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Passkey kaydı tamamlanamadı.",
      );
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function onRemovePasskey(id: string) {
    if (!window.confirm("Bu passkey silinsin mi?")) {
      return;
    }
    setPasskeyBusy(true);
    setError("");
    try {
      await deleteWebAuthnCredential(accessToken, id);
      const has = await reloadPasskeys();
      if (!has && mailAppLockEnabled) {
        const prefs = await updateInboxPreferences(accessToken, {
          mailAppLockEnabled: false,
        });
        setMailAppLockEnabled(false);
        onAppLockChange?.(false);
        setStatus("Son passkey silindi; posta kilidi kapatıldı.");
      } else {
        setStatus("Passkey silindi.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey silinemedi.");
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function onToggleAppLock(enabled: boolean) {
    if (enabled && passkeys.length === 0) {
      setError("Posta kilidi için önce passkey ekleyin.");
      return;
    }
    setAppLockBusy(true);
    setError("");
    try {
      const prefs = await updateInboxPreferences(accessToken, {
        mailAppLockEnabled: enabled,
      });
      setMailAppLockEnabled(prefs.preferences.mailAppLockEnabled);
      onAppLockChange?.(prefs.preferences.mailAppLockEnabled);
      setStatus(
        enabled
          ? "Posta kilidi açık — sekme açıldığında biyometrik doğrulama istenir."
          : "Posta kilidi kapalı.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Posta kilidi güncellenemedi.",
      );
    } finally {
      setAppLockBusy(false);
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
        Hesabınızı Authenticator (TOTP) ve cihaz passkey ile koruyun. Outlook
        mobildeki biyometri satırının web karşılığı passkey ve isteğe bağlı posta
        kilididir.
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
            <h3 className="mail-posta-card-title">Biyometri / passkey</h3>
            <p className="mail-posta-card-desc">
              Face ID, Touch ID, Windows Hello veya platform PIN.
            </p>
          </div>
          <span
            className={
              passkeys.length > 0
                ? "mail-security-pill mail-security-pill--on"
                : "mail-security-pill mail-security-pill--off"
            }
          >
            {passkeys.length > 0 ? `${passkeys.length} kayıt` : "Yok"}
          </span>
        </header>

        {passkeys.length > 0 ? (
          <ul className="mail-security-passkey-list">
            {passkeys.map((cred) => (
              <li key={cred.id} className="mail-security-passkey-row">
                <div>
                  <strong>{cred.deviceName ?? "Passkey"}</strong>
                  <small>
                    {cred.lastUsedAt
                      ? `Son kullanım: ${new Date(cred.lastUsedAt).toLocaleString("tr-TR")}`
                      : `Eklenme: ${new Date(cred.createdAt).toLocaleString("tr-TR")}`}
                  </small>
                </div>
                <button
                  type="button"
                  className="mail-premium-btn mail-premium-btn--ghost"
                  disabled={passkeyBusy}
                  onClick={() => void onRemovePasskey(cred.id)}
                >
                  Sil
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mail-security-status-text">
            Henüz passkey yok. Bu cihazda biyometrik kayıt ekleyin.
          </p>
        )}

        <label className="mail-premium-field">
          <span className="mail-premium-field-label">Cihaz adı (isteğe bağlı)</span>
          <input
            className="mail-premium-field-input"
            value={passkeyDeviceName}
            onChange={(e) => setPasskeyDeviceName(e.target.value)}
            placeholder="Örn. MacBook, iPhone"
            maxLength={120}
          />
        </label>
        <div className="mail-security-primary-actions">
          <button
            type="button"
            className="mail-premium-btn mail-premium-btn--primary"
            disabled={passkeyBusy || !passkeySupported()}
            onClick={() => void onAddPasskey()}
          >
            {passkeyBusy ? "Kaydediliyor…" : "Passkey ekle"}
          </button>
        </div>
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head mail-security-card-head">
          <div>
            <h3 className="mail-posta-card-title">Posta kilidi</h3>
            <p className="mail-posta-card-desc">
              Oturum içinde postayı yeniden açmadan önce passkey doğrulaması.
            </p>
          </div>
        </header>
        <label
          className={
            appLockBusy || passkeys.length === 0
              ? "mail-posta-toggle mail-posta-toggle--disabled"
              : "mail-posta-toggle"
          }
        >
          <input
            type="checkbox"
            className="mail-posta-toggle-input"
            checked={mailAppLockEnabled}
            disabled={appLockBusy || passkeys.length === 0}
            onChange={(e) => void onToggleAppLock(e.target.checked)}
          />
          <span className="mail-posta-toggle-track" aria-hidden="true">
            <span className="mail-posta-toggle-thumb" />
          </span>
          <span className="mail-posta-toggle-text">
            <span className="mail-posta-toggle-label">Posta kilidini kullan</span>
            <span className="mail-posta-toggle-hint">
              {passkeys.length === 0
                ? "Önce passkey ekleyin."
                : mailAppLockEnabled
                  ? "Oturumda postayı açmadan önce biyometrik doğrulama."
                  : "Kapalı — etkinleştirmek için açın."}
            </span>
          </span>
        </label>
      </section>

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
