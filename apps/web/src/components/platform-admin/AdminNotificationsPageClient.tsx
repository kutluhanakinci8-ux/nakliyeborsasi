"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  PlatformAdminApiClient,
  type EmailDeliveryHealth,
  type EmailOutboxRow,
  type PlatformNotificationSetting,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";
import { AdminPageHeader } from "./AdminPageHeader";
import { AdminGmailInboxPanel } from "./AdminGmailInboxPanel";
import { AdminMailAnalyticsPanel } from "./AdminMailAnalyticsPanel";
import { AdminOutboxPreviewModal } from "./AdminOutboxPreviewModal";
import { AdminMailPolicyPanel } from "./AdminMailPolicyPanel";
import { AdminPlatformSendingPanel } from "./AdminPlatformSendingPanel";
import type { EmailOutboxDetail } from "../../lib/PlatformAdminApiClient";

const EVENT_LABELS: Record<string, string> = {
  USER_REGISTERED: "Yeni kayıt",
  USER_LOGIN: "Her giriş",
  USER_FIRST_LOGIN: "İlk giriş (yedek)",
  EMAIL_VERIFICATION: "E-posta doğrulama",
  PASSWORD_RESET: "Şifre sıfırlama",
  AUCTION_BID_PLACED: "İhale — yeni teklif",
  AUCTION_OUTBID: "İhale — teklif geçildi",
  AUCTION_WON: "İhale — kazanan",
  AUCTION_PUBLISHED: "İhale yayınlandı",
  LISTING_NEW_OFFER: "Yeni teklif / ilan",
  MESSAGING_NEW_MESSAGE: "Yeni mesaj",
};

type OutboxStats = {
  sent: number;
  pending: number;
  failed: number;
  last24hSent: number;
};

function statusBadge(status: string): string {
  if (status === "sent") {
    return "pa-badge pa-badge--sent";
  }
  if (status === "pending") {
    return "pa-badge pa-badge--pending";
  }
  return "pa-badge pa-badge--failed";
}

export function AdminNotificationsPageClient() {
  const searchParams = useSearchParams();
  const { accessToken } = useWebSession();
  const [settings, setSettings] = useState<PlatformNotificationSetting[]>([]);
  const [outbox, setOutbox] = useState<EmailOutboxRow[]>([]);
  const [stats, setStats] = useState<OutboxStats | null>(null);
  const [testEmail, setTestEmail] = useState("lertalogistics@gmail.com");
  const [testEvent, setTestEvent] = useState("USER_LOGIN");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<EmailDeliveryHealth | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "pending" | "failed">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<
    "platform" | "operations" | "analytics" | "policy"
  >("platform");
  const [preview, setPreview] = useState<EmailOutboxDetail | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const [nextSettings, nextOutbox, nextHealth, nextStats] = await Promise.all([
        PlatformAdminApiClient.fetchNotificationSettings(accessToken),
        PlatformAdminApiClient.fetchNotificationOutbox(accessToken, 120),
        PlatformAdminApiClient.fetchEmailDeliveryHealth(accessToken),
        PlatformAdminApiClient.fetchEmailOutboxStats(accessToken),
      ]);
      setSettings(nextSettings);
      setOutbox(nextOutbox);
      setHealth(nextHealth);
      setStats(nextStats);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const gmail = searchParams.get("gmail");
    if (gmail === "connected") {
      setMessage("Gmail hesabı başarıyla bağlandı.");
      window.setTimeout(() => setMessage(""), 5000);
    } else if (gmail === "error" || gmail === "token_error") {
      setMessage("Gmail bağlantısı tamamlanamadı. OAuth ayarlarını kontrol edin.");
      window.setTimeout(() => setMessage(""), 6000);
    }
  }, [searchParams]);

  const filteredOutbox = useMemo(() => {
    const q = search.trim().toLowerCase();
    return outbox.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        row.recipientEmail.toLowerCase().includes(q) ||
        row.subject.toLowerCase().includes(q) ||
        row.eventCode.toLowerCase().includes(q)
      );
    });
  }, [outbox, statusFilter, search]);

  async function saveRecipients(eventCode: string, raw: string): Promise<void> {
    if (!accessToken) {
      return;
    }
    const emails = raw
      .split(/[,;]/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const updated = await PlatformAdminApiClient.updateNotificationSetting(
      accessToken,
      { eventCode, adminRecipientEmails: emails },
    );
    setSettings((current) =>
      current.map((row) => (row.eventCode === eventCode ? updated : row)),
    );
    setMessage("Alıcı listesi kaydedildi.");
    window.setTimeout(() => setMessage(""), 3000);
  }

  async function toggleAdmin(eventCode: string, enabled: boolean): Promise<void> {
    if (!accessToken) {
      return;
    }
    const updated = await PlatformAdminApiClient.updateNotificationSetting(
      accessToken,
      { eventCode, adminEmailEnabled: enabled },
    );
    setSettings((current) =>
      current.map((row) => (row.eventCode === eventCode ? updated : row)),
    );
  }

  async function toggleUser(eventCode: string, enabled: boolean): Promise<void> {
    if (!accessToken) {
      return;
    }
    const updated = await PlatformAdminApiClient.updateNotificationSetting(
      accessToken,
      { eventCode, userEmailEnabled: enabled },
    );
    setSettings((current) =>
      current.map((row) => (row.eventCode === eventCode ? updated : row)),
    );
  }

  async function openPreview(id: string): Promise<void> {
    if (!accessToken) {
      return;
    }
    const detail = await PlatformAdminApiClient.fetchEmailOutboxDetail(
      accessToken,
      id,
    );
    setPreview(detail);
  }

  async function sendTest(): Promise<void> {
    if (!accessToken) {
      return;
    }
    await PlatformAdminApiClient.sendTestNotificationEmail(
      accessToken,
      testEvent,
      testEmail,
    );
    setMessage("Test e-postası kuyruğa alındı.");
    await refresh();
    window.setTimeout(() => setMessage(""), 4000);
  }

  return (
    <div className="pa-page">
      <AdminPageHeader
        section="Sistem · Global bildirimler"
        title="E-posta ve operasyon merkezi"
        lead="Kurumsal transactional e-posta, admin uyarıları ve gönderim günlüğü. Çoklu alıcı, SMTP sağlığı ve kuyruk yönetimi tek ekranda."
        meta={
          <>
            <span className="admin-status-pill admin-status-pill--ok">
              {health?.emailEnabled ? "E-posta aktif" : "E-posta kapalı"}
            </span>
            {health ? (
              <span className="admin-status-pill">
                {health.deliveryMode.toUpperCase()} · {health.smtpHost}
              </span>
            ) : null}
          </>
        }
      />

      {message ? <p className="pa-toast">{message}</p> : null}
      {loading && !health ? <p className="module-hint">Yükleniyor…</p> : null}

      <nav className="pa-mail-tabs" aria-label="Mail bölümleri">
        <button
          type="button"
          className={
            activeTab === "platform"
              ? "pa-mail-tab is-active"
              : "pa-mail-tab"
          }
          onClick={() => setActiveTab("platform")}
        >
          Platform gönderim
        </button>
        <button
          type="button"
          className={
            activeTab === "operations"
              ? "pa-mail-tab is-active"
              : "pa-mail-tab"
          }
          onClick={() => setActiveTab("operations")}
        >
          Operasyon
        </button>
        <button
          type="button"
          className={
            activeTab === "analytics"
              ? "pa-mail-tab is-active"
              : "pa-mail-tab"
          }
          onClick={() => setActiveTab("analytics")}
        >
          Analitik
        </button>
        <button
          type="button"
          className={
            activeTab === "policy"
              ? "pa-mail-tab is-active"
              : "pa-mail-tab"
          }
          onClick={() => setActiveTab("policy")}
        >
          Politika & ESP
        </button>
      </nav>

      {activeTab === "platform" ? <AdminPlatformSendingPanel /> : null}
      {activeTab === "analytics" ? <AdminMailAnalyticsPanel /> : null}
      {activeTab === "policy" ? <AdminMailPolicyPanel /> : null}

      {activeTab === "operations" ? (
        <>
      <section className="pa-metric-row" aria-label="Gönderim özetleri">
        <article className="pa-metric">
          <p className="pa-metric-label">Son 24 saat (gönderildi)</p>
          <p className="pa-metric-value">{stats?.last24hSent ?? "—"}</p>
          <p className="pa-metric-hint">Transactional outbox</p>
        </article>
        <article className="pa-metric">
          <p className="pa-metric-label">Toplam gönderildi</p>
          <p className="pa-metric-value">{stats?.sent ?? "—"}</p>
        </article>
        <article className="pa-metric">
          <p className="pa-metric-label">Bekleyen</p>
          <p className="pa-metric-value">{stats?.pending ?? "—"}</p>
        </article>
        <article className="pa-metric">
          <p className="pa-metric-label">Başarısız</p>
          <p className="pa-metric-value">{stats?.failed ?? "—"}</p>
        </article>
      </section>

      <AdminGmailInboxPanel />

      <div className="pa-grid-2">
        {health ? (
          <section className="pa-panel">
            <h2 className="pa-panel-title">SMTP altyapısı</h2>
            <p className="pa-panel-lead">
              Üretim gönderimi ve bağlantı doğrulama. Mod:{" "}
              <span className="pa-badge pa-badge--gmail">{health.deliveryMode}</span>
            </p>
            <ul className="pa-kv-list">
              <li>
                <span>Sunucu</span>
                <span>{health.smtpHost}:{health.smtpPort}</span>
              </li>
              <li>
                <span>Gönderen</span>
                <span>{health.smtpFrom}</span>
              </li>
              <li>
                <span>Web linkleri</span>
                <span>{health.webPublicBaseUrl}</span>
              </li>
              <li>
                <span>Kimlik doğrulama</span>
                <span>{health.smtpAuthConfigured ? "Tanımlı" : "Yok"}</span>
              </li>
              <li>
                <span>Son doğrulama</span>
                <span>
                  {health.lastVerifyOk === null
                    ? "—"
                    : health.lastVerifyOk
                      ? "Başarılı"
                      : `Hata: ${health.lastVerifyError ?? ""}`}
                </span>
              </li>
            </ul>
            <div className="pa-toolbar">
              <button
                type="button"
                className="pa-btn pa-btn--secondary"
                onClick={() =>
                  accessToken &&
                  void PlatformAdminApiClient.verifyEmailSmtp(accessToken).then(
                    (result) => {
                      setHealth(result.health);
                      setMessage(
                        result.ok
                          ? "SMTP bağlantısı doğrulandı."
                          : result.error ?? "Doğrulama başarısız",
                      );
                      window.setTimeout(() => setMessage(""), 5000);
                    },
                  )
                }
              >
                SMTP doğrula
              </button>
              <button
                type="button"
                className="pa-btn pa-btn--ghost"
                onClick={() =>
                  accessToken &&
                  void PlatformAdminApiClient.drainEmailOutbox(accessToken).then(
                    (result) => {
                      setMessage(
                        `Kuyruk: ${result.processed} işlendi, ${result.sent} gönderildi.`,
                      );
                      void refresh();
                    },
                  )
                }
              >
                Kuyruğu işle
              </button>
              <button
                type="button"
                className="pa-btn pa-btn--ghost"
                onClick={() =>
                  accessToken &&
                  void PlatformAdminApiClient.retryFailedEmails(accessToken).then(
                    (result) => {
                      setMessage(`${result.retried} kayıt yeniden denendi.`);
                      void refresh();
                    },
                  )
                }
              >
                Başarısızları yeniden dene
              </button>
            </div>
          </section>
        ) : null}

        <section className="pa-panel">
          <h2 className="pa-panel-title">Test gönderimi</h2>
          <p className="pa-panel-lead">
            Kurumsal HTML şablonunu canlı SMTP ile doğrulayın.
          </p>
          <div className="pa-form-row">
            <label className="pa-label">
              Olay
              <select
                className="pa-input"
                value={testEvent}
                onChange={(event) => setTestEvent(event.target.value)}
              >
                {Object.keys(EVENT_LABELS).map((code) => (
                  <option key={code} value={code}>{EVENT_LABELS[code]}</option>
                ))}
              </select>
            </label>
            <label className="pa-label">
              Alıcı
              <input
                className="pa-input"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="pa-btn pa-btn--primary"
            onClick={() => void sendTest()}
          >
            Test e-postası gönder
          </button>
        </section>
      </div>

      <section className="pa-panel">
        <h2 className="pa-panel-title">Olay politikaları</h2>
        <p className="pa-panel-lead">
          Admin ve kullanıcı kanalları ayrı ayrı yönetilir. Alıcı listesi virgülle
          ayrılmış e-posta adresleridir (global operasyon ekipleri).
        </p>
        <div className="pa-event-grid">
          {settings.map((row) => (
            <article key={row.eventCode} className="pa-event-card">
              <div className="pa-event-card-head">
                <div>
                  <h3 className="pa-event-card-title">
                    {EVENT_LABELS[row.eventCode] ?? row.eventCode}
                  </h3>
                  <p className="pa-event-code">{row.eventCode}</p>
                </div>
                <label className="pa-switch" title="Admin e-posta">
                  <input
                    type="checkbox"
                    checked={row.adminEmailEnabled}
                    onChange={(event) =>
                      void toggleAdmin(row.eventCode, event.target.checked)
                    }
                  />
                  <span className="pa-switch-slider" />
                </label>
              </div>
              <label className="pa-label">
                Admin alıcıları
                <input
                  className="pa-input"
                  defaultValue={row.adminRecipientEmails.join(", ")}
                  onBlur={(event) =>
                    void saveRecipients(row.eventCode, event.target.value)
                  }
                />
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 12,
                  fontSize: "0.82rem",
                  color: "#64748b",
                }}
              >
                <span>Kullanıcı e-postası</span>
                <label className="pa-switch">
                  <input
                    type="checkbox"
                    checked={row.userEmailEnabled}
                    onChange={(event) =>
                      void toggleUser(row.eventCode, event.target.checked)
                    }
                  />
                  <span className="pa-switch-slider" />
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pa-panel">
        <h2 className="pa-panel-title">Gönderim günlüğü</h2>
        <p className="pa-panel-lead">Outbox kayıtları — filtreleyin ve durumu izleyin.</p>
        <div className="pa-table-toolbar">
          <select
            className="pa-input"
            style={{ maxWidth: 160 }}
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as typeof statusFilter)
            }
          >
            <option value="all">Tüm durumlar</option>
            <option value="sent">Gönderildi</option>
            <option value="pending">Bekliyor</option>
            <option value="failed">Başarısız</option>
          </select>
          <input
            className="pa-input"
            style={{ flex: 1, minWidth: 200 }}
            placeholder="Alıcı, konu veya olay ara…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button
            type="button"
            className="pa-btn pa-btn--ghost"
            onClick={() => void refresh()}
          >
            Yenile
          </button>
        </div>
        <div className="admin-data-table-wrap">
          <table className="pa-outbox-table">
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Olay</th>
                <th>Alıcı</th>
                <th>Konu</th>
                <th>Açılma</th>
                <th>Tıklama</th>
                <th>Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredOutbox.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString("tr-TR")}</td>
                  <td>
                    <code style={{ fontSize: "0.75rem" }}>{row.eventCode}</code>
                  </td>
                  <td>{row.recipientEmail}</td>
                  <td>
                    <span className="pa-outbox-subject" title={row.subject}>
                      {row.subject}
                    </span>
                  </td>
                  <td>{row.openCount ?? 0}</td>
                  <td>{row.clickCount ?? 0}</td>
                  <td>
                    <span className={statusBadge(row.status)}>{row.status}</span>
                    {row.bounceClass ? (
                      <span className="pa-outbox-error">bounce: {row.bounceClass}</span>
                    ) : null}
                    {row.lastError ? (
                      <span className="pa-outbox-error">{row.lastError}</span>
                    ) : null}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="pa-btn pa-btn--ghost"
                      style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                      onClick={() => void openPreview(row.id)}
                    >
                      Önizle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOutbox.length === 0 ? (
            <p className="module-hint" style={{ padding: 16 }}>
              Kayıt bulunamadı.
            </p>
          ) : null}
        </div>
      </section>
        </>
      ) : null}

      <AdminOutboxPreviewModal
        message={preview}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
