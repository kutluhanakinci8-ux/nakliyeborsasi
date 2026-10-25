"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchMailAccountHub,
  setDefaultMailSender,
  type MailAccountHubPayload,
} from "@/lib/mailApi";
import { resolveMailConsoleUrl } from "@/lib/mailApi";
import { MailEmailSocialLinksEditor } from "./MailEmailSocialLinksEditor";
import { MailDelegationExchangePanel } from "./MailDelegationExchangePanel";
import { MailGmailSyncPanel } from "./MailGmailSyncPanel";
import { MailTenantBrandingPanel } from "./MailTenantBrandingPanel";
import type { MailInboxBranding } from "@/lib/mailApi";

type Props = {
  accessToken: string;
  onBrandingSaved?: (branding: MailInboxBranding) => void;
};

export function MailAccountsSettingsPanel({
  accessToken,
  onBrandingSaved,
}: Props) {
  const [hub, setHub] = useState<MailAccountHubPayload | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchMailAccountHub(accessToken);
      setHub(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleDefault(senderId: string): Promise<void> {
    setStatus("");
    try {
      const result = await setDefaultMailSender(accessToken, senderId);
      setHub((prev) =>
        prev ? { ...prev, senders: result.senders } : prev,
      );
      setStatus("Varsayılan gönderen güncellendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    }
  }

  if (loading) {
    return (
      <div className="mail-accounts-settings mail-accounts-settings--premium">
        <div className="mail-posta-skeleton" aria-busy="true">
          <div className="mail-posta-skeleton-line mail-posta-skeleton-line--lead" />
          <div className="mail-posta-skeleton-card" />
          <div className="mail-posta-skeleton-card" />
        </div>
      </div>
    );
  }
  if (error && !hub) {
    return (
      <p className="mail-accounts-status mail-accounts-status--err">{error}</p>
    );
  }
  if (!hub) {
    return null;
  }

  const consoleUrl = resolveMailConsoleUrl();

  return (
    <div className="mail-accounts-settings mail-accounts-settings--premium">
      <div className="mail-accounts-hero">
        <p className="mail-accounts-hero-label">Kurumsal posta kutusu</p>
        <p className="mail-accounts-hero-address">
          {hub.primaryAddress ?? "Henüz atanmadı"}
        </p>
        {hub.unreadCount > 0 ? (
          <p className="mail-accounts-hero-meta">
            {hub.unreadCount} okunmamış mesaj
          </p>
        ) : null}
        {hub.branding?.emailBrandTitle ? (
          <p className="mail-accounts-hero-meta">
            Marka: {hub.branding.emailBrandTitle}
          </p>
        ) : null}
      </div>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Kurumsal kimlik</h3>
          <p className="mail-posta-card-desc">
            Logo, marka rengi, yasal dipnot ve varsayılan gönderen adı — giden
            HTML şablon ve webmail başlığında kullanılır.
          </p>
        </header>
        <MailTenantBrandingPanel
          accessToken={accessToken}
          canEdit={hub.canManageSenders}
          onBrandingSaved={(branding) => {
            setHub((prev) => (prev ? { ...prev, branding } : prev));
            onBrandingSaved?.(branding);
          }}
        />
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">E-posta alt bilgisi</h3>
          <p className="mail-posta-card-desc">
            Gönderdiğiniz kurumsal postaların altında tıklanabilir sosyal medya
            ikonları görünür (alıcı önizlemesinde de yer alır).
          </p>
        </header>
        <MailEmailSocialLinksEditor
          accessToken={accessToken}
          canEdit={hub.canManageSenders}
        />
      </section>

      <section className="mail-posta-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Gönderen kimlikleri</h3>
          <p className="mail-posta-card-desc">
            Yeni mesajlarda kullanılan From adresi ve görünen ad.
          </p>
        </header>
        <ul className="mail-accounts-list--premium">
          {hub.senders.map((sender) => (
            <li
              key={sender.id}
              className={
                sender.isDefault
                  ? "mail-accounts-card is-default"
                  : "mail-accounts-card"
              }
            >
              <div className="mail-accounts-card-main">
                <span className="mail-accounts-card-email">
                  {sender.fromAddress}
                </span>
                {sender.displayName ? (
                  <span className="mail-accounts-card-name">
                    {sender.displayName}
                  </span>
                ) : null}
              </div>
              <div className="mail-accounts-card-actions">
                {sender.isDefault ? (
                  <span className="mail-accounts-badge">Varsayılan</span>
                ) : hub.canManageSenders ? (
                  <button
                    type="button"
                    className="mail-premium-btn mail-premium-btn--ghost"
                    onClick={() => void handleDefault(sender.id)}
                  >
                    Varsayılan yap
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mail-posta-card mail-posta-card--muted">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">Takma adlar (alias)</h3>
          <p className="mail-posta-card-desc">
            Ek adresler gelen kutunuza yönlendirilir.
          </p>
        </header>
        {hub.aliases.length === 0 ? (
          <p className="mail-accounts-muted">Kayıtlı alias yok.</p>
        ) : (
          <ul className="mail-accounts-list--premium">
            {hub.aliases.map((alias) => (
              <li key={alias.id} className="mail-accounts-card mail-accounts-card--alias">
                <div className="mail-accounts-card-main">
                  <span className="mail-accounts-card-email">
                    {alias.aliasEmail}
                  </span>
                  <span className="mail-accounts-card-name">
                    → {alias.targets[0]?.emailAddress ?? "—"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {hub.canManageSenders ? (
          <p className="mail-accounts-muted mail-accounts-console-link">
            Yeni alias veya domain için{" "}
            <a href={consoleUrl} target="_blank" rel="noreferrer">
              yönetim konsolu
            </a>
            .
          </p>
        ) : null}
      </section>

      <MailDelegationExchangePanel
        accessToken={accessToken}
        hub={hub}
        onHubChange={setHub}
      />

      <MailGmailSyncPanel
        accessToken={accessToken}
        hub={hub}
        onHubChange={setHub}
      />

      {status ? (
        <p className="mail-accounts-status mail-accounts-status--ok" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="mail-accounts-status mail-accounts-status--err" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
