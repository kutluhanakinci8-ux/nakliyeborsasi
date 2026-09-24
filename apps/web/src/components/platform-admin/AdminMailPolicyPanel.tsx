"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PlatformAdminApiClient,
  type NotificationCatalogEvent,
  type EmailSuppressionRow,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminMailPolicyPanel() {
  const { accessToken } = useWebSession();
  const [catalog, setCatalog] = useState<NotificationCatalogEvent[]>([]);
  const [suppressions, setSuppressions] = useState<EmailSuppressionRow[]>([]);
  const [delivery, setDelivery] = useState<{
    mode: string;
    webhookUrls: { postmark: string; ses: string };
  } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const [events, list, deliveryInfo] = await Promise.all([
        PlatformAdminApiClient.fetchNotificationCatalog(accessToken),
        PlatformAdminApiClient.fetchEmailSuppressions(accessToken),
        PlatformAdminApiClient.fetchEmailDeliveryInfo(accessToken),
      ]);
      setCatalog(events);
      setSuppressions(list);
      setDelivery(deliveryInfo);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addSuppression(): Promise<void> {
    if (!accessToken || !newEmail.trim()) {
      return;
    }
    await PlatformAdminApiClient.addEmailSuppression(accessToken, newEmail.trim());
    setNewEmail("");
    await refresh();
  }

  async function removeSuppression(email: string): Promise<void> {
    if (!accessToken) {
      return;
    }
    await PlatformAdminApiClient.removeEmailSuppression(accessToken, email);
    await refresh();
  }

  async function syncGmailBounces(): Promise<void> {
    if (!accessToken) {
      return;
    }
    const result = await PlatformAdminApiClient.syncGmailBounces(accessToken);
    window.alert(
      `Gmail tarandı: ${result.scanned} mesaj, ${result.suppressionsAdded} suppression eklendi.`,
    );
    await refresh();
  }

  return (
    <div className="pa-mail-policy">
      {loading ? <p className="module-hint">Politika yükleniyor…</p> : null}

      <section className="pa-panel">
        <h2 className="pa-panel-title">Olay matrisi (F3)</h2>
        <p className="pa-panel-lead">
          İhale, teklif ve mesaj olayları kullanıcı profil tercihleriyle
          eşleştirilir. Platform geneli anahtarlar Operasyon sekmesindeki
          olay politikalarından yönetilir.
        </p>
        <div className="admin-data-table-wrap">
          <table className="pa-outbox-table">
            <thead>
              <tr>
                <th>Olay</th>
                <th>Kategori</th>
                <th>Kullanıcı tercihi</th>
                <th>Varsayılan admin</th>
                <th>Varsayılan kullanıcı</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((row) => (
                <tr key={row.code}>
                  <td>
                    <strong>{row.labelTr}</strong>
                    <br />
                    <code style={{ fontSize: "0.72rem" }}>{row.code}</code>
                  </td>
                  <td>{row.category}</td>
                  <td>{row.userPreferenceKey ?? "—"}</td>
                  <td>{row.defaultAdminEnabled ? "Açık" : "Kapalı"}</td>
                  <td>{row.defaultUserEnabled ? "Açık" : "Kapalı"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pa-panel">
        <h2 className="pa-panel-title">Suppression listesi</h2>
        <p className="pa-panel-lead">
          Bounce, şikâyet ve manuel engeller. Bu adreslere outbox gönderimi
          yapılmaz.
        </p>
        <div className="pa-toolbar">
          <input
            className="pa-input"
            placeholder="E-posta engelle"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
          />
          <button
            type="button"
            className="pa-btn pa-btn--secondary"
            onClick={() => void addSuppression()}
          >
            Ekle
          </button>
          <button
            type="button"
            className="pa-btn pa-btn--ghost"
            onClick={() => void syncGmailBounces()}
          >
            Gmail bounce tara
          </button>
        </div>
        <div className="admin-data-table-wrap" style={{ marginTop: 12 }}>
          <table className="pa-outbox-table">
            <thead>
              <tr>
                <th>E-posta</th>
                <th>Neden</th>
                <th>Kaynak</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {suppressions.map((row) => (
                <tr key={row.emailAddress}>
                  <td>{row.emailAddress}</td>
                  <td>{row.reason}</td>
                  <td>{row.source}</td>
                  <td>
                    <button
                      type="button"
                      className="pa-btn pa-btn--ghost"
                      style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                      onClick={() => void removeSuppression(row.emailAddress)}
                    >
                      Kaldır
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {delivery ? (
        <section className="pa-panel">
          <h2 className="pa-panel-title">ESP / webhook (F4)</h2>
          <p className="pa-panel-lead">
            Gönderim modu: <strong>{delivery.mode}</strong>. Postmark için{" "}
            <code>EMAIL_DELIVERY_PROVIDER=postmark</code> ve{" "}
            <code>POSTMARK_SERVER_TOKEN</code> tanımlayın.
          </p>
          <ul className="pa-kv-list">
            <li>
              <span>Postmark webhook</span>
              <span style={{ fontSize: "0.75rem" }}>{delivery.webhookUrls.postmark}</span>
            </li>
            <li>
              <span>Amazon SES webhook</span>
              <span style={{ fontSize: "0.75rem" }}>{delivery.webhookUrls.ses}</span>
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}
