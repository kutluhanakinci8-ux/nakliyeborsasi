"use client";

import { useCallback, useEffect, useState } from "react";
import { MailComplianceAuditPanel } from "./MailComplianceAuditPanel";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import {
  downloadMailPrivacyExport,
  fetchAiMailConsent,
  patchAiMailConsent,
  resolveMailConsoleUrl,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
};

export function MailPrivacySettingsPanel({ accessToken }: Props) {
  const { t } = useMailLocale();
  const [aiMailConsent, setAiMailConsent] = useState(false);
  const [aiConsentBusy, setAiConsentBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const reload = useCallback(async () => {
    const payload = await fetchAiMailConsent(accessToken);
    setAiMailConsent(payload.aiMailAssistConsent);
  }, [accessToken]);

  useEffect(() => {
    void (async () => {
      setInitialLoading(true);
      setError("");
      try {
        await reload();
      } catch {
        setError(t("privacyErrLoad"));
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [reload]);

  async function onToggleAiConsent(next: boolean) {
    setAiConsentBusy(true);
    setError("");
    setStatus("");
    try {
      await patchAiMailConsent(accessToken, next);
      setAiMailConsent(next);
      setStatus(
        next
          ? t("privacyAiOn")
          : t("privacyAiOff"),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("privacyErrConsent"));
    } finally {
      setAiConsentBusy(false);
    }
  }

  async function onExport() {
    setExporting(true);
    setStatus("");
    setError("");
    try {
      const { blob, filename } = await downloadMailPrivacyExport(accessToken);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus(t("privacyExportDone"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("privacyErrExport"));
    } finally {
      setExporting(false);
    }
  }

  const consoleUrl = resolveMailConsoleUrl();

  if (initialLoading) {
    return (
      <div className="mail-privacy-panel mail-privacy-panel--premium">
        <div className="mail-posta-skeleton" aria-busy="true">
          <div className="mail-posta-skeleton-line mail-posta-skeleton-line--lead" />
          <div className="mail-posta-skeleton-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="mail-privacy-panel mail-privacy-panel--premium">
      <p className="mail-posta-intro">{t("privacyIntro")}</p>

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
        <header className="mail-posta-card-head mail-privacy-card-head">
          <div>
            <h3 className="mail-posta-card-title">{t("privacyAccessTitle")}</h3>
<p className="mail-posta-card-desc">{t("privacyAccessDesc")}</p>
          </div>
          <span className="mail-privacy-pill">{t("privacyArticlePill")}</span>
        </header>
        <ul className="mail-privacy-bullets">
          <li>{t("privacyBullet1")}</li>
          <li>{t("privacyBullet2")}</li>
          <li>{t("privacyBullet3")}</li>
        </ul>
        <div className="mail-privacy-actions">
          <button
            type="button"
            className="mail-premium-btn mail-premium-btn--primary"
            disabled={exporting}
            onClick={() => void onExport()}
          >
            {exporting ? t("privacyPreparing") : t("privacyExportBtn")}
          </button>
        </div>
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head mail-privacy-card-head">
          <div>
            <h3 className="mail-posta-card-title">{t("privacyAiTitle")}</h3>
<p className="mail-posta-card-desc">{t("privacyAiDesc")}</p>
          </div>
          <span
            className={
              aiMailConsent
                ? "mail-privacy-pill mail-privacy-pill--on"
                : "mail-privacy-pill mail-privacy-pill--off"
            }
          >
            {aiMailConsent ? t("privacyConsentOn") : t("privacyConsentOff")}
          </span>
        </header>
        <label
          className={
            aiConsentBusy
              ? "mail-posta-toggle mail-posta-toggle--disabled"
              : "mail-posta-toggle"
          }
        >
          <input
            type="checkbox"
            className="mail-posta-toggle-input"
            checked={aiMailConsent}
            disabled={aiConsentBusy}
            onChange={(e) => void onToggleAiConsent(e.target.checked)}
          />
          <span className="mail-posta-toggle-track" aria-hidden="true">
            <span className="mail-posta-toggle-thumb" />
          </span>
          <span className="mail-posta-toggle-text">
<span className="mail-posta-toggle-label">{t("privacyAiToggle")}</span>
<span className="mail-posta-toggle-hint">{t("privacyAiToggleHint")}</span>
          </span>
        </label>
      </section>

      <MailComplianceAuditPanel accessToken={accessToken} />

      <section className="mail-posta-card mail-posta-card--muted">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">{t("privacyConsoleTitle")}</h3>
<p className="mail-posta-card-desc">{t("privacyConsoleDesc")}</p>
        </header>
        <a
          className="mail-privacy-console-link"
          href={consoleUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("privacyConsoleOpen")}
        </a>
      </section>
    </div>
  );
}
