"use client";

import { useMailLocale } from "@/lib/MailLocaleProvider";
import { useEffect, useState } from "react";
import {
  fetchConnectedInboxStatus,
  updateConnectedInboxEntitlement,
  type MailConnectedInboxStatus,
} from "@/lib/mailApi";

type Props = {
  accessToken: string;
  canManage?: boolean;
};

export function MailConnectedInboxStatusPanel({
  accessToken,
  canManage = false,
}: Props) {
  const { t } = useMailLocale();
  const featureLabels: Record<keyof MailConnectedInboxStatus["features"], string> = {
    unifiedInbox: t("connectedFeatUnified"),
    connectedSend: t("connectedFeatSend"),
    deepSearch: t("connectedFeatSearch"),
    draftSync: t("connectedFeatDrafts"),
    trashSync: t("connectedFeatTrash"),
    graphPush: t("connectedFeatGraphPush"),
    gmailPush: t("connectedFeatGmailPush"),
  };
  const [status, setStatus] = useState<MailConnectedInboxStatus | null>(null);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [premiumEnabled, setPremiumEnabled] = useState(true);
  const [maxConnectedAccounts, setMaxConnectedAccounts] = useState(10);

  useEffect(() => {
    void fetchConnectedInboxStatus(accessToken)
      .then((payload) => {
        setStatus(payload);
        setPremiumEnabled(payload.entitlement.premiumEnabled);
        setMaxConnectedAccounts(payload.entitlement.maxConnectedAccounts);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("connectedErrLoad")),
      );
  }, [accessToken]);

  async function handleSaveEntitlement(): Promise<void> {
    setSaveStatus("");
    setError("");
    try {
      const result = await updateConnectedInboxEntitlement(accessToken, {
        premiumEnabled,
        maxConnectedAccounts,
      });
      setStatus((prev) =>
        prev ? { ...prev, entitlement: result.entitlement } : prev,
      );
      setSaveStatus(t("connectedEntitlementSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errGenericSave"));
    }
  }

  return (
    <section className="mail-posta-card mail-help-topic-card">
      <h3 className="mail-help-topic-title">{t("connectedTitle")}</h3>
      <p className="mail-help-topic-desc">
        {t("connectedDesc")}
      </p>
      {error ? (
        <p className="mail-accounts-status mail-accounts-status--err">{error}</p>
      ) : null}
      {!status && !error ? (
        <p className="mail-accounts-muted">{t("readLoading")}</p>
      ) : null}
      {status ? (
        <>
          <ul className="mail-connected-status-grid">
            <li>
              <span className="mail-accounts-muted">{t("connectedMsOAuth")}</span>
              <span
                className={
                  status.exchangeConfigured
                    ? "mail-accounts-badge"
                    : "mail-accounts-badge mail-accounts-badge--muted"
                }
              >
                {status.exchangeConfigured ? t("connectedConfigured") : t("connectedMissingEnv")}
              </span>
            </li>
            <li>
              <span className="mail-accounts-muted">{t("connectedGmailOAuth")}</span>
              <span
                className={
                  status.gmailConfigured
                    ? "mail-accounts-badge"
                    : "mail-accounts-badge mail-accounts-badge--muted"
                }
              >
                {status.gmailConfigured ? t("connectedConfigured") : t("connectedMissingEnv")}
              </span>
            </li>
            <li>
              <span className="mail-accounts-muted">{t("connectedPremium")}</span>
              <span className="mail-accounts-badge">
                {status.entitlement.premiumEnabled
                  ? t("connectedPremiumOn", { count: status.entitlement.connectedCount, max: status.entitlement.maxConnectedAccounts })
                  : t("stateOff")}
              </span>
            </li>
          </ul>
          <p className="mail-accounts-muted mail-connected-status-features-title">
            {t("connectedFeaturesTitle")}
          </p>
          <ul className="mail-connected-status-features">
            {(
              Object.entries(status.features) as Array<
                [keyof MailConnectedInboxStatus["features"], boolean]
              >
            ).map(([key, on]) => (
              <li key={key}>
                <span
                  className={
                    on
                      ? "mail-connected-feature-pill is-on"
                      : "mail-connected-feature-pill"
                  }
                >
                  {featureLabels[key]}
                </span>
              </li>
            ))}
          </ul>
          {canManage ? (
            <div className="mail-connected-entitlement-form">
              <p className="mail-accounts-muted mail-connected-status-features-title">
                {t("connectedManageTitle")}
              </p>
              <label className="mail-connected-entitlement-row">
                <input
                  type="checkbox"
                  checked={premiumEnabled}
                  onChange={(e) => setPremiumEnabled(e.target.checked)}
                />
                {t("connectedPremiumToggle")}
              </label>
              <label className="mail-connected-entitlement-row">
                <span className="mail-accounts-muted">{t("connectedMaxAccounts")}</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={maxConnectedAccounts}
                  onChange={(e) =>
                    setMaxConnectedAccounts(
                      Number.parseInt(e.target.value, 10) || 0,
                    )
                  }
                  className="mail-premium-input mail-premium-input--narrow"
                />
              </label>
              <button
                type="button"
                className="mail-premium-btn mail-premium-btn--ghost"
                onClick={() => void handleSaveEntitlement()}
              >
                {t("actionSave")}
              </button>
              {saveStatus ? (
                <p className="mail-accounts-status mail-accounts-status--ok">
                  {saveStatus}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
