"use client";

import { useMailLocale } from "@/lib/MailLocaleProvider";
import type { MailImapSettings } from "@/lib/mailApi";

type Props = {
  settings: MailImapSettings | null;
  newPassword: string | null;
  loading: boolean;
  error: string;
  copyHint: string;
  onCopyHint: (msg: string) => void;
  onProvision: () => void;
  onRotate: () => void;
  onReconcileMaildir?: () => void;
  reconcileBusy?: boolean;
};

function buildClientBundle(
  settings: MailImapSettings,
  password: string,
  tr: (key: string, params?: Record<string, string | number>) => string,
): string {
  const smtpSec = settings.smtpSecurity === "ssl" ? "SSL" : "STARTTLS";
  return [
    tr("imapBundleTitle"),
    tr("imapBundleIncoming", { host: settings.imapHost, port: settings.imapPort }),
    tr("imapBundleOutgoing", { host: settings.smtpHost, port: settings.smtpPort, sec: smtpSec }),
    tr("imapBundleUser", { user: settings.username ?? "" }),
    tr("imapBundlePassword", { password }),
    "",
    tr("imapBundleFooter"),
  ].join("\n");
}

function EndpointRow({
  icon,
  label,
  value,
  hint,
  onCopy,
  copyLabel,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  onCopy: () => void;
  copyLabel: string;
}) {
  return (
    <li className="mail-imap-endpoint">
      <span className="mail-imap-endpoint-icon" aria-hidden="true">{icon}</span>
      <div className="mail-imap-endpoint-main">
        <span className="mail-imap-endpoint-label">{label}</span>
        <code className="mail-imap-endpoint-value">{value}</code>
        {hint ? <p className="mail-imap-endpoint-hint">{hint}</p> : null}
      </div>
      <button
        type="button"
        className="mail-premium-btn mail-premium-btn--ghost mail-imap-copy-btn"
        onClick={onCopy}
      >
        {copyLabel}
      </button>
    </li>
  );
}

export function MailImapClientSetup({
  settings,
  newPassword,
  loading,
  error,
  copyHint,
  onCopyHint,
  onProvision,
  onRotate,
  onReconcileMaildir,
  reconcileBusy = false,
}: Props) {
  const { t, localeTag } = useMailLocale();
  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      onCopyHint(t("imapCopied", { label }));
      window.setTimeout(() => onCopyHint(""), 2500);
    } catch {
      onCopyHint(t("securityCopyFailed"));
    }
  }

  function confirmRotate(action: () => void) {
    const hasCred = settings?.hasCredential;
    if (!hasCred) {
      action();
      return;
    }
    const ok = window.confirm(
      t("imapConfirmRotate"),
    );
    if (ok) {
      action();
    }
  }

  if (!settings) {
    return (
      <div className="mail-imap-panel mail-imap-panel--premium">
        <div className="mail-posta-skeleton" aria-busy="true">
          <div className="mail-posta-skeleton-line mail-posta-skeleton-line--lead" />
          <div className="mail-posta-skeleton-card" />
          <div className="mail-posta-skeleton-card" />
        </div>
      </div>
    );
  }

  if (!settings.enabled) {
    return (
      <div className="mail-imap-panel mail-imap-panel--premium">
<p className="mail-posta-intro">{t("imapIntroDisabled")}</p>
        <div className="mail-imap-empty" role="status">
          <span className="mail-imap-empty-icon" aria-hidden="true">📭</span>
          <p>{t("imapDisabled")}</p>
        </div>
      </div>
    );
  }

  const needsSetup = settings.needsImapClientPassword ?? !settings.hasCredential;
  const smtpSecLabel =
    settings.smtpSecurity === "ssl" ? "(SSL)" : "(STARTTLS)";
  const imapEndpoint = `${settings.imapHost}:${settings.imapPort}${
    settings.imapTls ? " (SSL/TLS)" : ""
  }`;
  const smtpEndpoint = `${settings.smtpHost}:${settings.smtpPort} ${smtpSecLabel}`;
  const credentialUpdated = settings.credentialUpdatedAt
    ? new Date(settings.credentialUpdatedAt).toLocaleString(localeTag)
    : null;

  return (
    <div className="mail-imap-panel mail-imap-panel--premium">
<p className="mail-posta-intro">{t("imapIntro")}</p>

      {copyHint ? (
        <p className="mail-accounts-status mail-accounts-status--ok" role="status">
          {copyHint}
        </p>
      ) : null}
      {error ? (
        <p className="mail-accounts-status mail-accounts-status--err" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mail-posta-card">
        <header className="mail-posta-card-head mail-imap-card-head">
          <div>
            <h3 className="mail-posta-card-title">{t("imapStatusTitle")}</h3>
<p className="mail-posta-card-desc">{t("imapStatusDesc")}</p>
          </div>
          <span
            className={
              needsSetup
                ? "mail-imap-pill mail-imap-pill--warn"
                : "mail-imap-pill mail-imap-pill--ok"
            }
          >
            {needsSetup ? t("imapNeedsSetup") : t("imapReady")}
          </span>
        </header>
        {needsSetup ? (
          <p className="mail-imap-status-text" role="status">
{t("imapFirstSetup")}
          </p>
        ) : (
          <p className="mail-imap-status-text" role="status">
{t("imapReadyStatus", { updatedPart: credentialUpdated ? t("imapUpdatedPart", { when: credentialUpdated }) : "" })}
          </p>
        )}
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">{t("imapConnTitle")}</h3>
<p className="mail-posta-card-desc">{t("imapConnDesc")}</p>
        </header>
        <ul className="mail-imap-endpoints">
          <EndpointRow
            icon="📥"
            label={t("imapIncoming")}
            value={imapEndpoint}
            copyLabel={t("imapCopy")}
            onCopy={() =>
              void copyText(
                t("imapCopyImapServer"),
                `${settings.imapHost}:${settings.imapPort}`,
              )
            }
          />
          <EndpointRow
            icon="👤"
            label={t("imapUser")}
            value={settings.username ?? "—"}
            copyLabel={t("imapCopy")}
            onCopy={() => {
              if (settings.username) {
                void copyText(t("imapCopyUser"), settings.username);
              }
            }}
          />
          <EndpointRow
            icon="📤"
            label={t("imapOutgoing")}
            value={smtpEndpoint}
            hint={t("imapAuthHint")}
            copyLabel={t("imapCopy")}
            onCopy={() =>
              void copyText(
                t("imapCopySmtpServer"),
                `${settings.smtpHost}:${settings.smtpPort}`,
              )
            }
          />
        </ul>
        <div className="mail-imap-folder-note">
          <span className="mail-imap-folder-note-label">{t("imapSentFolder")}</span>
          <p>{settings.sentFolderImapHint}</p>
        </div>
      </section>

      {newPassword ? (
        <section
          className="mail-posta-card mail-imap-password-card"
          aria-live="polite"
        >
          <header className="mail-posta-card-head">
            <h3 className="mail-posta-card-title">{t("imapPasswordTitle")}</h3>
<p className="mail-posta-card-desc">{t("imapPasswordDesc")}</p>
          </header>
          <code className="mail-imap-password-value">{newPassword}</code>
          <div className="mail-imap-password-actions">
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--primary"
              onClick={() => void copyText(t("imapCopyPasswordLabel"), newPassword)}
            >
              {t("imapCopyPassword")}
            </button>
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--ghost"
              onClick={() =>
                void copyText(
                  t("imapCopyBundleLabel"),
                  buildClientBundle(settings, newPassword, t),
                )
              }
            >
              {t("imapCopyBundle")}
            </button>
          </div>
        </section>
      ) : null}

      <section className="mail-posta-card mail-imap-actions-card">
        <div className="mail-imap-primary-actions">
          {needsSetup ? (
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--primary"
              disabled={loading}
              onClick={() => onProvision()}
            >
              {loading ? t("imapCreating") : t("imapCreatePassword")}
            </button>
          ) : (
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--primary"
              disabled={loading}
              onClick={() => confirmRotate(onRotate)}
            >
              {loading ? t("imapRotating") : t("imapRotatePassword")}
            </button>
          )}
          {!needsSetup ? (
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--ghost"
              disabled={loading || !newPassword}
              onClick={() => {
                if (newPassword) {
                  void copyText(
                    t("imapCopyBundleLabel"),
                    buildClientBundle(settings, newPassword, t),
                  );
                }
              }}
            >
              {t("imapRecopyPassword")}
            </button>
          ) : null}
          {onReconcileMaildir ? (
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--ghost"
              disabled={loading || reconcileBusy}
              onClick={() => onReconcileMaildir()}
            >
              {reconcileBusy ? t("imapReconcileBusy") : t("imapReconcile")}
            </button>
          ) : null}
        </div>
        <a
          className="mail-imap-help-link"
          href="/help/imap"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("imapGuideLink")}
        </a>
      </section>

      <section className="mail-posta-card mail-posta-card--muted">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">{t("imapMobileTitle")}</h3>
<p className="mail-posta-card-desc">{t("imapMobileDesc")}</p>
        </header>
        <ol className="mail-help-steps mail-imap-mobile-steps">
<li>{t("imapMobileStep1")}</li>
<li>{t("imapMobileStep2")}</li>
<li>{t("imapMobileStep3")}</li>
<li>{t("imapMobileStep4")}</li>
<li>{t("imapMobileStep5")}</li>
        </ol>
        <a
          className="mail-imap-help-link"
          href="/help/imap#outlook-mobile"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("imapMobileGuide")}
        </a>
      </section>
    </div>
  );
}
