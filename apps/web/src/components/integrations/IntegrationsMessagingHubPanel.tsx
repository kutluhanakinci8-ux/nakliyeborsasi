"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  MessagingIntegrationApiClient,
  type MessagingIntegrationSnapshot,
} from "../../lib/MessagingIntegrationApiClient";
import { PublicApiConfiguration } from "../../lib/PublicApiConfiguration";

type Props = {
  accessToken: string;
  isCompanyOwner: boolean;
  channelSettingsHref?: string;
  messagingHref?: string;
};

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement("textarea");
  area.value = value;
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

export function IntegrationsMessagingHubPanel({
  accessToken,
  isCompanyOwner,
  channelSettingsHref = "/messaging?tab=sohbet",
  messagingHref = "/messaging?tab=sohbet",
}: Props) {
  const [snapshot, setSnapshot] = useState<MessagingIntegrationSnapshot | null>(
    null,
  );
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!isCompanyOwner || !accessToken) {
      return;
    }
    void MessagingIntegrationApiClient.fetchSnapshot(accessToken)
      .then((payload) => setSnapshot(payload.integration))
      .catch(() => setError("Mesajlaşma entegrasyon özetine erişilemedi."));
  }, [accessToken, isCompanyOwner]);

  const apiBase = snapshot
    ? `${PublicApiConfiguration.resolveBaseUrl()}${snapshot.publicApiBasePath}`
    : `${PublicApiConfiguration.resolveBaseUrl()}/api/v1/public/lerta-messaging/v1`;

  const activeWebhooks =
    snapshot?.webhooks.filter((hook) => hook.enabled).length ?? 0;

  return (
    <section className="integrations-premium-panel integrations-premium-panel--hub">
      <div className="integrations-panel-head">
        <h2 className="integrations-panel-title">Firma sohbeti & API</h2>
        <p className="integrations-panel-sub">
          Webhook, partner API ve WhatsApp bildirim köprüsü — FS-12 kanal paketi.
        </p>
      </div>

      {!isCompanyOwner ? (
        <p className="integrations-panel-hint">
          API ve kanal ayarları yalnızca firma sahibi tarafından yönetilir. Detay için
          yetkili kullanıcıya başvurun veya{" "}
          <Link href={messagingHref}>Mesajlar</Link> üzerinden sohbet kullanın.
        </p>
      ) : null}

      {error ? <p className="error banner error--light">{error}</p> : null}

      <div className="integrations-hub-grid">
        <article className="integrations-hub-card">
          <p className="integrations-hub-card-kicker">Partner API</p>
          <h3 className="integrations-hub-card-title">Lerta Messaging v1</h3>
          <p className="integrations-hub-card-text">
            OAuth scope:{" "}
            <code>{snapshot?.requiredOAuthScopes.join(", ") ?? "messaging:read, messaging:write"}</code>
          </p>
          <code className="integrations-code-block">{apiBase}</code>
          <button
            type="button"
            className="btn-outline-header integrations-copy-btn"
            onClick={() => {
              void copyText(apiBase).then(() => {
                setCopied("api");
                window.setTimeout(() => setCopied(""), 2000);
              });
            }}
          >
            {copied === "api" ? "Kopyalandı" : "Base URL kopyala"}
          </button>
        </article>

        <article className="integrations-hub-card">
          <p className="integrations-hub-card-kicker">Webhook</p>
          <h3 className="integrations-hub-card-title">
            {activeWebhooks > 0 ? `${activeWebhooks} aktif uç` : "Henüz webhook yok"}
          </h3>
          <p className="integrations-hub-card-text">
            Zapier / Make veya özel ERP için{" "}
            <code>message.created</code>, <code>thread.opened</code>,{" "}
            <code>message.stamped</code>.
          </p>
          <span
            className={
              activeWebhooks > 0
                ? "integrations-status-pill integrations-status-pill--ok"
                : "integrations-status-pill"
            }
          >
            {activeWebhooks > 0 ? "Bağlı" : "Yapılandırılabilir"}
          </span>
        </article>

        <article className="integrations-hub-card">
          <p className="integrations-hub-card-kicker">WhatsApp FS-12</p>
          <h3 className="integrations-hub-card-title">
            {snapshot?.whatsappBridge.enabled ? "Bildirim köprüsü açık" : "Kapalı"}
          </h3>
          <p className="integrations-hub-card-text">
            {snapshot?.whatsappBridge.notifyE164Masked
              ? `Numara: ${snapshot.whatsappBridge.notifyE164Masked}`
              : "Yeni mesaj uyarısı ve deep link — tam sohbet WA'da değil."}
          </p>
          {snapshot?.whatsappBridge.deliveryWarningTr ? (
            <p className="integrations-hub-warn" role="alert">
              {snapshot.whatsappBridge.deliveryWarningTr}
            </p>
          ) : null}
          <span
            className={
              snapshot?.whatsappBridge.deliveryConfigured
                ? "integrations-status-pill integrations-status-pill--ok"
                : "integrations-status-pill integrations-status-pill--warn"
            }
          >
            {snapshot?.whatsappBridge.channel && snapshot.whatsappBridge.channel !== "none"
              ? `Kanal: ${snapshot.whatsappBridge.channel}`
              : "Sunucu teslimi bekleniyor"}
          </span>
        </article>

        <article className="integrations-hub-card">
          <p className="integrations-hub-card-kicker">Slack</p>
          <h3 className="integrations-hub-card-title">
            {snapshot?.slackBridge.enabled ? "Köprü etkin" : "Slack köprüsü"}
          </h3>
          <p className="integrations-hub-card-text">
            {snapshot?.slackBridge.configured
              ? "Incoming webhook tanımlı."
              : "İsteğe bağlı — mesaj özeti Slack kanalına."}
          </p>
        </article>
      </div>

      {isCompanyOwner ? (
        <div className="integrations-hub-actions">
          <Link href={channelSettingsHref} className="btn-accent btn-accent--compact">
            Mesajlar → Kanal ayarları
          </Link>
          {snapshot?.companyId ? (
            <button
              type="button"
              className="btn-secondary btn-secondary--light"
              onClick={() => {
                void copyText(snapshot.companyId).then(() => {
                  setCopied("company");
                  window.setTimeout(() => setCopied(""), 2000);
                });
              }}
            >
              {copied === "company" ? "Firma ID kopyalandı" : "Firma ID"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
