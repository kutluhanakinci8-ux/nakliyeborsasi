"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PlatformAdminApiClient,
  type EmailDeliveryHealth,
  type EmailOutboxRow,
  type PlatformNotificationSetting,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

const EVENT_LABELS: Record<string, string> = {
  USER_REGISTERED: "Yeni kayıt",
  USER_LOGIN: "Her giriş",
  USER_FIRST_LOGIN: "İlk giriş (yedek)",
  EMAIL_VERIFICATION: "E-posta doğrulama",
  PASSWORD_RESET: "Şifre sıfırlama",
};

export function AdminNotificationsPageClient() {
  const { accessToken } = useWebSession();
  const [settings, setSettings] = useState<PlatformNotificationSetting[]>([]);
  const [outbox, setOutbox] = useState<EmailOutboxRow[]>([]);
  const [testEmail, setTestEmail] = useState("lertalogistics@gmail.com");
  const [testEvent, setTestEvent] = useState("USER_LOGIN");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<EmailDeliveryHealth | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const [nextSettings, nextOutbox, nextHealth] = await Promise.all([
        PlatformAdminApiClient.fetchNotificationSettings(accessToken),
        PlatformAdminApiClient.fetchNotificationOutbox(accessToken, 80),
        PlatformAdminApiClient.fetchEmailDeliveryHealth(accessToken),
      ]);
      setSettings(nextSettings);
      setOutbox(nextOutbox);
      setHealth(nextHealth);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    <div className="admin-page module-page">
      <header className="exchange-hero account-page-hero">
        <div>
          <p className="exchange-eyebrow">Sistem</p>
          <h1 className="exchange-title">E-posta bildirimleri</h1>
          <p className="exchange-lead">
            Admin alıcı listesi (çoklu e-posta), olay anahtarları ve gönderim
            günlüğü. Şablonlar şimdilik Türkçe (admin).
          </p>
        </div>
      </header>

      {message ? <p className="account-save-hint">{message}</p> : null}
      {loading ? <p className="module-hint">Yükleniyor…</p> : null}

      {health ? (
        <section className="account-card module-panel module-panel--elevated">
          <h2 className="account-card-title">SMTP durumu</h2>
          <p className="account-card-lead">
            Mod: <strong>{health.deliveryMode}</strong> ({health.smtpHost}:{health.smtpPort})
            {health.deliveryMode === "mailpit"
              ? " — mesajlar Mailpit’te; Gmail kutusu için SMTP_PROFILE=gmail ve uygulama şifresi."
              : null}
          </p>
          <ul className="account-card-lead">
            <li>Gönderen: {health.smtpFrom}</li>
            <li>Web linkleri: {health.webPublicBaseUrl}</li>
            <li>
              SMTP kimlik: {health.smtpAuthConfigured ? "tanımlı" : "yok (Mailpit için normal)"}
            </li>
            <li>
              Son doğrulama:{" "}
              {health.lastVerifyOk === null
                ? "henüz yok"
                : health.lastVerifyOk
                  ? "başarılı"
                  : `hata — ${health.lastVerifyError ?? ""}`}
            </li>
          </ul>
          <div className="account-form-grid">
            <button
              type="button"
              className="btn-account-secondary"
              onClick={() =>
                void PlatformAdminApiClient.verifyEmailSmtp(accessToken!).then(
                  (result) => {
                    setHealth(result.health);
                    setMessage(result.ok ? "SMTP bağlantısı doğrulandı." : result.error ?? "Doğrulama başarısız");
                    window.setTimeout(() => setMessage(""), 5000);
                  },
                )
              }
            >
              SMTP doğrula
            </button>
            <button
              type="button"
              className="btn-account-secondary"
              onClick={() =>
                void PlatformAdminApiClient.drainEmailOutbox(accessToken!).then(
                  (result) => {
                    setMessage(
                      `Kuyruk: ${result.processed} işlendi, ${result.sent} gönderildi, ${result.failed} hata.`,
                    );
                    void refresh();
                    window.setTimeout(() => setMessage(""), 5000);
                  },
                )
              }
            >
              Kuyruğu işle
            </button>
            <button
              type="button"
              className="btn-account-secondary"
              onClick={() =>
                void PlatformAdminApiClient.retryFailedEmails(accessToken!).then(
                  (result) => {
                    setMessage(`${result.retried} başarısız kayıt yeniden denendi.`);
                    void refresh();
                    window.setTimeout(() => setMessage(""), 5000);
                  },
                )
              }
            >
              Başarısızları yeniden dene
            </button>
          </div>
        </section>
      ) : null}

      <section className="account-card module-panel module-panel--elevated">
        <h2 className="account-card-title">Test gönderimi</h2>
        <div className="account-form-grid">
          <label className="label-light">
            Olay
            <select
              className="input-light"
              value={testEvent}
              onChange={(event) => setTestEvent(event.target.value)}
            >
              {Object.keys(EVENT_LABELS).map((code) => (
                <option key={code} value={code}>{EVENT_LABELS[code]}</option>
              ))}
            </select>
          </label>
          <label className="label-light">
            Alıcı
            <input
              className="input-light"
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
            />
          </label>
        </div>
        <button type="button" className="btn-account-primary" onClick={() => void sendTest()}>
          Test gönder
        </button>
      </section>

      <section className="account-card module-panel module-panel--elevated">
        <h2 className="account-card-title">Olay ayarları</h2>
        <ul className="account-partner-list">
          {settings.map((row) => (
            <li key={row.eventCode} className="account-partner-item">
              <div>
                <strong>{EVENT_LABELS[row.eventCode] ?? row.eventCode}</strong>
                <p className="account-card-lead">{row.eventCode}</p>
                <label className="label-light account-form-span-2">
                  Admin alıcıları (virgülle)
                  <input
                    className="input-light"
                    defaultValue={row.adminRecipientEmails.join(", ")}
                    onBlur={(event) =>
                      void saveRecipients(row.eventCode, event.target.value)
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                className={
                  row.adminEmailEnabled
                    ? "account-corridor-chip active"
                    : "account-corridor-chip"
                }
                onClick={() =>
                  void toggleAdmin(row.eventCode, !row.adminEmailEnabled)
                }
              >
                Admin e-posta {row.adminEmailEnabled ? "açık" : "kapalı"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="account-card module-panel module-panel--elevated">
        <h2 className="account-card-title">Gönderim günlüğü (outbox)</h2>
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Olay</th>
                <th>Alıcı</th>
                <th>Konu</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {outbox.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString("tr-TR")}</td>
                  <td>{row.eventCode}</td>
                  <td>{row.recipientEmail}</td>
                  <td>{row.subject}</td>
                  <td>
                    {row.status}
                    {row.lastError ? ` — ${row.lastError}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
