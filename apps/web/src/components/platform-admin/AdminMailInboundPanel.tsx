"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PlatformAdminApiClient,
  type MailInboundMessageRow,
} from "../../lib/PlatformAdminApiClient";
import { useWebSession } from "../../context/WebSessionProvider";

export function AdminMailInboundPanel() {
  const { accessToken } = useWebSession();
  const [messages, setMessages] = useState<MailInboundMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState("kutluhan@kullanici.lerta.tr");
  const [sender, setSender] = useState("test@example.com");
  const [subject, setSubject] = useState("C1 spike test");
  const [text, setText] = useState("Pilot inbound mesajı — outbox ile karışmaz.");
  const [toast, setToast] = useState("");

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      setMessages(
        await PlatformAdminApiClient.fetchMailInboundMessages(accessToken),
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function simulate(): Promise<void> {
    if (!accessToken || !recipient.trim()) {
      return;
    }
    setToast("");
    try {
      await PlatformAdminApiClient.simulateMailInbound(accessToken, {
        recipient: recipient.trim(),
        sender: sender.trim(),
        subject: subject.trim(),
        text: text.trim(),
      });
      setToast("Simülasyon kaydedildi.");
      await refresh();
    } catch {
      setToast(
        "Kayıt başarısız — alıcı için doğrulanmış domain + gönderen kimliği gerekir.",
      );
    }
  }

  return (
    <div className="pa-mail-inbound">
      <section className="pa-panel">
        <h2 className="pa-panel-title">Faz C1 — Gelen posta (spike)</h2>
        <p className="pa-panel-lead">
          Inbound webhook <code>POST /api/v1/mail/inbound/webhook</code> (secret
          header). Postfix pipe ve MX planı:{" "}
          <code>docs/EMAIL_FAZ_C_C1_INBOUND_SPIKE.md</code>. Outbox bildirimleri
          burada listelenmez.
        </p>
        <div className="pa-toolbar" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
          <input
            className="pa-input"
            placeholder="Alıcı"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <input
            className="pa-input"
            placeholder="Gönderen"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
          />
          <input
            className="pa-input"
            placeholder="Konu"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <button
            type="button"
            className="pa-btn pa-btn--primary"
            onClick={() => void simulate()}
          >
            Simüle inbound
          </button>
          <button
            type="button"
            className="pa-btn pa-btn--secondary"
            onClick={() => void refresh()}
          >
            Yenile
          </button>
        </div>
        <textarea
          className="pa-input"
          style={{ width: "100%", minHeight: "4rem", marginTop: "0.5rem" }}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {toast ? <p className="pa-panel-lead">{toast}</p> : null}
      </section>

      <section className="pa-panel">
        <h2 className="pa-panel-title">Son gelen mesajlar</h2>
        {loading ? <p className="module-hint">Yükleniyor…</p> : null}
        <div className="admin-data-table-wrap">
          <table className="pa-outbox-table">
            <thead>
              <tr>
                <th>Alındı</th>
                <th>Kutu</th>
                <th>Kimden</th>
                <th>Konu</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                    {new Date(row.receivedAt).toLocaleString("tr-TR")}
                  </td>
                  <td>
                    <code>{row.emailAddress}</code>
                    <br />
                    <span style={{ fontSize: "0.68rem" }}>
                      org {row.organizationId.slice(0, 8)}…
                    </span>
                  </td>
                  <td>{row.fromAddress}</td>
                  <td>
                    <strong>{row.subject}</strong>
                    {row.snippet ? (
                      <p className="module-hint" style={{ margin: "0.25rem 0 0" }}>
                        {row.snippet}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
              {messages.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="module-hint">
                    Henüz inbound kayıt yok — simülasyon veya webhook deneyin.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
