"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchCompanyMailInbox,
  fetchCompanyMailInboxMessage,
  markCompanyMailInboxRead,
  type MailInboxListItem,
  type MailInboxMessageDetail,
  type MailInboxSummary,
} from "../../lib/CompanyMailInboxApi";
import { useWebSession } from "../../context/WebSessionProvider";

export function OrganizationMailInboxPanel() {
  const { accessToken } = useWebSession();
  const [summary, setSummary] = useState<MailInboxSummary | null>(null);
  const [messages, setMessages] = useState<MailInboxListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailInboxMessageDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    try {
      const inbox = await fetchCompanyMailInbox(accessToken);
      setSummary(inbox.summary);
      setMessages(inbox.messages);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openMessage(id: string): Promise<void> {
    if (!accessToken) {
      return;
    }
    setSelectedId(id);
    const message = await fetchCompanyMailInboxMessage(accessToken, id);
    setDetail(message);
    if (!message.readAt) {
      await markCompanyMailInboxRead(accessToken, id);
      void refresh();
    }
  }

  if (!accessToken) {
    return null;
  }

  return (
    <section
      id="org-gelen-kutusu"
      className="account-card module-panel module-panel--elevated account-org-section"
    >
      <p className="account-verify-eyebrow">Faz C2 — Gelen kutusu</p>
      <h2 className="account-card-title">Kurumsal posta (gelen)</h2>
      <p className="account-card-lead">
        Dışarıdan gelen yanıtlar bildirim outbox&apos;undan ayrı tutulur. Adres:{" "}
        <strong>{summary?.primaryAddress ?? "—"}</strong>
        {summary && summary.unreadCount > 0 ? (
          <> — {summary.unreadCount} okunmamış</>
        ) : null}
      </p>

      {loading && !summary ? <p className="module-hint">Yükleniyor…</p> : null}

      {!summary?.primaryAddress ? (
        <p className="module-hint">
          Önce Faz B&apos;de kurumsal gönderen adresi oluşturun; MX yönlendikten
          sonra gelen posta burada listelenir.
        </p>
      ) : null}

      <div
        className="account-org-mail-inbox"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        <ul className="module-hint" style={{ listStyle: "none", padding: 0 }}>
          {messages.map((row) => (
            <li key={row.id} style={{ marginBottom: "0.5rem" }}>
              <button
                type="button"
                className={
                  selectedId === row.id
                    ? "btn-account-primary"
                    : "btn-account-secondary"
                }
                style={{ width: "100%", textAlign: "left" }}
                onClick={() => void openMessage(row.id)}
              >
                <strong>{row.readAt ? "" : "• "}{row.subject}</strong>
                <br />
                <span style={{ fontSize: "0.85rem" }}>
                  {row.fromAddress} —{" "}
                  {new Date(row.receivedAt).toLocaleString("tr-TR")}
                </span>
              </button>
            </li>
          ))}
          {messages.length === 0 && summary?.primaryAddress ? (
            <li>Henüz gelen mesaj yok.</li>
          ) : null}
        </ul>

        <div className="account-card" style={{ padding: "1rem" }}>
          {detail ? (
            <>
              <h3 className="account-card-title" style={{ fontSize: "1rem" }}>
                {detail.subject}
              </h3>
              <p className="module-hint">
                Kimden: {detail.fromAddress} → {detail.emailAddress}
              </p>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: "0.85rem",
                  marginTop: "0.75rem",
                }}
              >
                {detail.bodyText ?? detail.snippet ?? "(içerik yok)"}
              </pre>
            </>
          ) : (
            <p className="module-hint">Listeden bir mesaj seçin.</p>
          )}
        </div>
      </div>
    </section>
  );
}
