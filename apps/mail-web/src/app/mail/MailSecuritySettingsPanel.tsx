"use client";

import { useMailLocale } from "@/lib/MailLocaleProvider";
import { useCallback, useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { MailCryptoSettingsPanel } from "./MailCryptoSettingsPanel";
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
  const { t, localeTag } = useMailLocale();
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
        setError(t("securityErrLoad"));
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
      setStatus(t("securityTotpSetupHint"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("securityErrTotpBegin"));
    } finally {
      setSetupBusy(false);
    }
  }

  async function onConfirmSetup() {
    if (!totpCode.trim() || totpCode.trim().length < 6) {
      setError(t("securityErrTotpCode"));
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
      setStatus(t("securityTotpEnabled"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("securityErrCodeVerify"));
    } finally {
      setConfirmBusy(false);
    }
  }

  async function onAddPasskey() {
    if (!passkeySupported()) {
      setError(t("securityErrPasskeyUnsupported"));
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
      setStatus(t("securityPasskeySaved"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("securityErrPasskeyRegister"),
      );
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function onRemovePasskey(id: string) {
    if (!window.confirm(t("securityConfirmRemovePasskey"))) {
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
        setStatus(t("securityLastPasskeyRemoved"));
      } else {
        setStatus(t("securityPasskeyRemoved"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("securityErrPasskeyRemove"));
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function onToggleAppLock(enabled: boolean) {
    if (enabled && passkeys.length === 0) {
      setError(t("securityErrAppLockNeedPasskey"));
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
          ? t("securityAppLockOn")
          : t("securityAppLockOff"),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("securityErrAppLockUpdate"),
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
      <p className="mail-posta-intro">{t("securityIntro")}</p>

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
            <h3 className="mail-posta-card-title">{t("securityPasskeyTitle")}</h3>
<p className="mail-posta-card-desc">{t("securityPasskeyDesc")}</p>
          </div>
          <span
            className={
              passkeys.length > 0
                ? "mail-security-pill mail-security-pill--on"
                : "mail-security-pill mail-security-pill--off"
            }
          >
            {passkeys.length > 0 ? t("securityPasskeyCount", { count: passkeys.length }) : t("securityPasskeyNone")}
          </span>
        </header>

        {passkeys.length > 0 ? (
          <ul className="mail-security-passkey-list">
            {passkeys.map((cred) => (
              <li key={cred.id} className="mail-security-passkey-row">
                <div>
                  <strong>{cred.deviceName ?? t("securityPasskeyDefaultName")}</strong>
                  <small>
                    {cred.lastUsedAt
                      ? t("securityLastUsed", { when: new Date(cred.lastUsedAt).toLocaleString(localeTag) })
                      : t("securityAddedAt", { when: new Date(cred.createdAt).toLocaleString(localeTag) })}
                  </small>
                </div>
                <button
                  type="button"
                  className="mail-premium-btn mail-premium-btn--ghost"
                  disabled={passkeyBusy}
                  onClick={() => void onRemovePasskey(cred.id)}
                >
                  {t("actionDelete")}
                </button>
              </li>
            ))}
          </ul>
        ) : (
<p className="mail-security-status-text">{t("securityPasskeyEmpty")}</p>
        )}

        <label className="mail-premium-field">
          <span className="mail-premium-field-label">{t("securityDeviceNameLabel")}</span>
          <input
            className="mail-premium-field-input"
            value={passkeyDeviceName}
            onChange={(e) => setPasskeyDeviceName(e.target.value)}
            placeholder={t("securityDeviceNamePlaceholder")}
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
            {passkeyBusy ? t("securityAddingPasskey") : t("securityAddPasskey")}
          </button>
        </div>
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head mail-security-card-head">
          <div>
            <h3 className="mail-posta-card-title">{t("securityMailLockTitle")}</h3>
<p className="mail-posta-card-desc">{t("securityMailLockDesc")}</p>
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
            <span className="mail-posta-toggle-label">{t("securityMailLockToggle")}</span>
            <span className="mail-posta-toggle-hint">
              {passkeys.length === 0
                ? t("securityMailLockHintNeedPasskey")
                : mailAppLockEnabled
                  ? t("securityMailLockHintOn")
                  : t("securityMailLockHintOff")}
            </span>
          </span>
        </label>
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head mail-security-card-head">
          <div>
            <h3 className="mail-posta-card-title">{t("securityTotpTitle")}</h3>
<p className="mail-posta-card-desc">{t("securityTotpDesc")}</p>
          </div>
          <span
            className={
              totpEnabled
                ? "mail-security-pill mail-security-pill--on"
                : "mail-security-pill mail-security-pill--off"
            }
          >
            {totpEnabled ? t("stateOn") : t("stateOff")}
          </span>
        </header>

        {totpEnabled ? (
          <p className="mail-security-status-text" role="status">
{t("securityTotpActiveHint")}
          </p>
        ) : totpSecret ? (
          <div className="mail-security-setup">
            <p className="mail-security-setup-label">{t("securityTotpSetupSecretLabel")}</p>
            <code className="mail-security-secret">{totpSecret}</code>
            <div className="mail-security-setup-actions">
              <button
                type="button"
                className="mail-premium-btn mail-premium-btn--ghost"
                onClick={() =>
                  void (async () => {
                    const ok = await copySecret(totpSecret);
                    setCopyHint(ok ? t("securitySecretCopied") : t("securityCopyFailed"));
                    window.setTimeout(() => setCopyHint(""), 2500);
                  })()
                }
              >
                {t("securityCopySecret")}
              </button>
            </div>
            <label className="mail-premium-field">
              <span className="mail-premium-field-label">{t("securityVerifyCodeLabel")}</span>
              <input
                className="mail-premium-field-input mail-security-code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t("securityVerifyCodePlaceholder")}
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
                {confirmBusy ? t("securityVerifying") : t("securityEnable")}
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
                {t("composeCancel")}
              </button>
            </div>
          </div>
        ) : (
          <>
<p className="mail-security-status-text">{t("securityTotpOffHint")}</p>
            <div className="mail-security-primary-actions">
              <button
                type="button"
                className="mail-premium-btn mail-premium-btn--primary"
                disabled={setupBusy}
                onClick={() => void onBeginSetup()}
              >
                {setupBusy ? t("securityPreparing") : t("securitySetupTotp")}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">{t("securityPgpTitle")}</h3>
<p className="mail-posta-card-desc">{t("securityPgpDesc")}</p>
        </header>
        <MailCryptoSettingsPanel accessToken={accessToken} />
      </section>

      <section className="mail-posta-card mail-posta-card--muted">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">{t("securityTotpDisableTitle")}</h3>
<p className="mail-posta-card-desc">{t("securityTotpDisableDesc")}</p>
        </header>
        <a
          className="mail-privacy-console-link"
          href={consoleSecurityUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("securityConsoleLink")}
        </a>
      </section>
    </div>
  );
}
