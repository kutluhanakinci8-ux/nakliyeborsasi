"use client";

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

const FEATURE_LABELS: Record<
  keyof MailConnectedInboxStatus["features"],
  string
> = {
  unifiedInbox: "Birleşik gelen kutusu",
  connectedSend: "Bağlı hesaptan gönderim",
  deepSearch: "Bulut arama",
  draftSync: "Taslak senkronu",
  trashSync: "Çöp / arşiv senkronu",
  graphPush: "Microsoft anlık bildirim",
  gmailPush: "Gmail Pub/Sub",
};

export function MailConnectedInboxStatusPanel({
  accessToken,
  canManage = false,
}: Props) {
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
        setError(err instanceof Error ? err.message : "Durum yüklenemedi"),
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
      setSaveStatus("Entitlement kaydedildi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    }
  }

  return (
    <section className="mail-posta-card mail-help-topic-card">
      <h3 className="mail-help-topic-title">Bağlı gelen kutusu (CAP)</h3>
      <p className="mail-help-topic-desc">
        Sunucu yapılandırması ve premium özellik bayrakları. OAuth bağlantısı
        kurulduğunda hesaplar bu özellikleri kullanır.
      </p>
      {error ? (
        <p className="mail-accounts-status mail-accounts-status--err">{error}</p>
      ) : null}
      {!status && !error ? (
        <p className="mail-accounts-muted">Yükleniyor…</p>
      ) : null}
      {status ? (
        <>
          <ul className="mail-connected-status-grid">
            <li>
              <span className="mail-accounts-muted">Microsoft Graph OAuth</span>
              <span
                className={
                  status.exchangeConfigured
                    ? "mail-accounts-badge"
                    : "mail-accounts-badge mail-accounts-badge--muted"
                }
              >
                {status.exchangeConfigured ? "Tanımlı" : "Eksik env"}
              </span>
            </li>
            <li>
              <span className="mail-accounts-muted">Gmail OAuth</span>
              <span
                className={
                  status.gmailConfigured
                    ? "mail-accounts-badge"
                    : "mail-accounts-badge mail-accounts-badge--muted"
                }
              >
                {status.gmailConfigured ? "Tanımlı" : "Eksik env"}
              </span>
            </li>
            <li>
              <span className="mail-accounts-muted">Premium</span>
              <span className="mail-accounts-badge">
                {status.entitlement.premiumEnabled
                  ? `Açık · ${status.entitlement.connectedCount}/${status.entitlement.maxConnectedAccounts} hesap`
                  : "Kapalı"}
              </span>
            </li>
          </ul>
          <p className="mail-accounts-muted mail-connected-status-features-title">
            Kod özellikleri
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
                  {FEATURE_LABELS[key]}
                </span>
              </li>
            ))}
          </ul>
          {canManage ? (
            <div className="mail-connected-entitlement-form">
              <p className="mail-accounts-muted mail-connected-status-features-title">
                Yönetim (CAP entitlement)
              </p>
              <label className="mail-connected-entitlement-row">
                <input
                  type="checkbox"
                  checked={premiumEnabled}
                  onChange={(e) => setPremiumEnabled(e.target.checked)}
                />
                Premium bağlı gelen kutusu açık
              </label>
              <label className="mail-connected-entitlement-row">
                <span className="mail-accounts-muted">Maks. bağlı hesap</span>
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
                Kaydet
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
