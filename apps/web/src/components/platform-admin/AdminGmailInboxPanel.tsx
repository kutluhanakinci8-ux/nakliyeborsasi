"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PlatformAdminApiClient,
  type GmailConnectionStatus,
  type GmailInboxMessage,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminGmailInboxPanel() {
  const { accessToken } = useWebSession();
  const [status, setStatus] = useState<GmailConnectionStatus | null>(null);
  const [redirectUri, setRedirectUri] = useState("");
  const [messages, setMessages] = useState<GmailInboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = await PlatformAdminApiClient.fetchGmailStatus(accessToken);
      setStatus(payload.status);
      setRedirectUri(payload.redirectUri);
      if (payload.status.connected) {
        const inbox = await PlatformAdminApiClient.fetchGmailMessages(
          accessToken,
          50,
        );
        setMessages(inbox);
      } else {
        setMessages([]);
      }
    } catch {
      setError("Gmail durumu okunamadı.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function startConnect(): Promise<void> {
    if (!accessToken) {
      return;
    }
    const result = await PlatformAdminApiClient.startGmailConnect(accessToken);
    if (!result.ok || !result.authUrl) {
      setError(result.error ?? "OAuth başlatılamadı");
      return;
    }
    window.location.href = result.authUrl;
  }

  async function disconnect(): Promise<void> {
    if (!accessToken) {
      return;
    }
    await PlatformAdminApiClient.disconnectGmail(accessToken);
    await refresh();
  }

  return (
    <section className="pa-panel" id="gmail-inbox">
      <h2 className="pa-panel-title">Gmail gelen kutusu</h2>
      <p className="pa-panel-lead">
        Google, Gmail web arayüzünü başka sitelerin içine gömmeyi izin vermez.
        Bu bölüm <strong>Gmail API</strong> ile gelen kutunuzu panelde listeler;
        tam yanıt ve klasörler için &quot;Gmail&apos;de aç&quot; kullanın.
      </p>

      {error ? <p className="pa-toast" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>{error}</p> : null}

      {loading ? <p className="module-hint">Gmail yükleniyor…</p> : null}

      {status ? (
        <ul className="pa-kv-list">
          <li>
            <span>OAuth yapılandırması</span>
            <span>{status.configured ? "Hazır" : "Client ID gerekli"}</span>
          </li>
          <li>
            <span>Bağlantı</span>
            <span>{status.connected ? status.emailAddress ?? "Bağlı" : "Bağlı değil"}</span>
          </li>
          {redirectUri ? (
            <li>
              <span>Redirect URI</span>
              <span style={{ fontSize: "0.75rem" }}>{redirectUri}</span>
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="pa-toolbar">
        {!status?.connected ? (
          <button
            type="button"
            className="pa-btn pa-btn--primary"
            disabled={!status?.configured}
            onClick={() => void startConnect()}
          >
            Gmail hesabını bağla
          </button>
        ) : (
          <>
            <button
              type="button"
              className="pa-btn pa-btn--secondary"
              onClick={() => void refresh()}
            >
              Yenile
            </button>
            <button
              type="button"
              className="pa-btn pa-btn--ghost"
              onClick={() => void disconnect()}
            >
              Bağlantıyı kaldır
            </button>
          </>
        )}
        <a
          className="pa-btn pa-btn--ghost"
          href="https://mail.google.com/mail/u/0/#inbox"
          target="_blank"
          rel="noopener noreferrer"
        >
          Tam Gmail (yeni sekme)
        </a>
      </div>

      {!status?.configured ? (
        <p className="pa-panel-lead" style={{ marginTop: 16 }}>
          Kurulum: Google Cloud → Gmail API + OAuth Web client. VPS{" "}
          <code>.env</code> içine <code>GOOGLE_GMAIL_CLIENT_ID</code> ve{" "}
          <code>GOOGLE_GMAIL_CLIENT_SECRET</code> ekleyin. Detay:{" "}
          <code>docs/GMAIL_INBOX_IN_ADMIN.md</code>
        </p>
      ) : null}

      {status?.connected && messages.length > 0 ? (
        <div className="admin-data-table-wrap" style={{ marginTop: 16 }}>
          <table className="pa-outbox-table">
            <thead>
              <tr>
                <th>Gönderen</th>
                <th>Konu</th>
                <th>Özet</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {messages.map((row) => (
                <tr key={row.id}>
                  <td style={{ maxWidth: 180 }}>{row.from}</td>
                  <td className="pa-outbox-subject" title={row.subject}>
                    {row.subject}
                  </td>
                  <td style={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {row.snippet}
                  </td>
                  <td>
                    <a
                      href={row.gmailWebUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pa-btn pa-btn--ghost"
                      style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                    >
                      Gmail&apos;de aç
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {status?.connected && !loading && messages.length === 0 ? (
        <p className="module-hint" style={{ marginTop: 12 }}>
          Gelen kutusu boş veya okunamadı.
        </p>
      ) : null}
    </section>
  );
}
