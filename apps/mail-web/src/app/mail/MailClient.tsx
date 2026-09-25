"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  composeMail,
  fetchInbox,
  fetchMessage,
  fetchSentMessage,
  markRead,
  replyMail,
  type MailInboxListItem,
  type MailInboxMessageDetail,
  type MailInboxSummary,
  type MailSentItem,
  type MailSentMessageDetail,
} from "@/lib/mailApi";
import { useMailSession } from "@/lib/session";

type View = "inbox" | "spam" | "sent" | "all";

export function MailClient() {
  const router = useRouter();
  const { accessToken, logout } = useMailSession();
  const [view, setView] = useState<View>("inbox");
  const [summary, setSummary] = useState<MailInboxSummary | null>(null);
  const [messages, setMessages] = useState<MailInboxListItem[]>([]);
  const [sent, setSent] = useState<MailSentItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailInboxMessageDetail | null>(null);
  const [sentPreview, setSentPreview] = useState<MailSentMessageDetail | null>(
    null,
  );
  const [replyText, setReplyText] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeText, setComposeText] = useState("");
  const [toast, setToast] = useState("");
  const [composeError, setComposeError] = useState("");
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const folder =
      view === "spam" ? "spam" : view === "all" ? "all" : "inbox";
    const data = await fetchInbox(accessToken, folder);
    setSummary(data.summary);
    setMessages(data.messages);
    setSent(data.sent);
  }, [accessToken, view]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void refresh();
  }, [accessToken, refresh, router]);

  async function openMessage(id: string) {
    if (!accessToken) {
      return;
    }
    setSelectedId(id);
    const message = await fetchMessage(accessToken, id);
    setDetail(message);
    setReplyText("");
    if (!message.readAt) {
      await markRead(accessToken, id);
      void refresh();
    }
  }

  async function sendReply() {
    if (!accessToken || !selectedId || !replyText.trim()) {
      return;
    }
    await replyMail(accessToken, selectedId, replyText.trim());
    setToast("Yanıt gönderildi.");
    setReplyText("");
  }

  async function sendCompose() {
    if (!accessToken) {
      return;
    }
    if (!composeTo.trim() || !composeSubject.trim() || !composeText.trim()) {
      setComposeError("Kime, konu ve mesaj zorunlu.");
      return;
    }
    setComposeError("");
    setSending(true);
    try {
      await composeMail(accessToken, {
        to: composeTo.trim(),
        subject: composeSubject.trim(),
        text: composeText,
      });
      setComposeOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeText("");
      setToast("Gönderildi.");
      setView("sent");
      void refresh();
    } catch (error) {
      setComposeError(
        error instanceof Error
          ? error.message
          : "Gönderilemedi. SMTP veya kurumsal kutu ayarını kontrol edin.",
      );
    } finally {
      setSending(false);
    }
  }

  const listItems =
    view === "sent"
      ? sent.map((s) => ({
          id: s.id,
          fromAddress: "Gönderilen",
          subject: s.subject,
          snippet: s.toAddress,
          receivedAt: s.sentAt,
          readAt: s.sentAt,
          spamStatus: "clean",
        }))
      : messages;

  return (
    <div className="mail-app">
      <aside className="mail-sidebar">
        <div className="mail-brand">
          <strong>Lerta</strong> Posta
        </div>
        <button
          type="button"
          className="mail-compose-btn"
          onClick={() => {
            setComposeError("");
            setComposeOpen(true);
          }}
        >
          Yaz
        </button>
        <nav className="mail-nav">
          <button
            type="button"
            className={view === "inbox" ? "active" : ""}
            onClick={() => {
              setView("inbox");
              setDetail(null);
              setSentPreview(null);
              setSelectedId(null);
            }}
          >
            Gelen
            {summary && summary.unreadCount > 0
              ? ` (${summary.unreadCount})`
              : ""}
          </button>
          <button
            type="button"
            className={view === "sent" ? "active" : ""}
            onClick={() => {
              setView("sent");
              setDetail(null);
              setSentPreview(null);
              setSelectedId(null);
            }}
          >
            Gönderilen
          </button>
          <button
            type="button"
            className={view === "spam" ? "active" : ""}
            onClick={() => {
              setView("spam");
              setDetail(null);
              setSentPreview(null);
              setSelectedId(null);
            }}
          >
            Spam
          </button>
        </nav>
        <div className="mail-address">
          {summary?.primaryAddress ?? "—"}
          <br />
          <button
            type="button"
            style={{
              marginTop: 8,
              border: "none",
              background: "none",
              color: "var(--accent)",
              cursor: "pointer",
              padding: 0,
            }}
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Çıkış
          </button>
        </div>
      </aside>

      <section className="mail-list">
        {listItems.length === 0 ? (
          <p className="mail-empty">Mesaj yok</p>
        ) : (
          listItems.map((m) => (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              className={`mail-list-item ${selectedId === m.id ? "selected" : ""} ${!m.readAt && view !== "sent" ? "unread" : ""}`}
              onClick={() => {
                if (view === "sent") {
                  setSelectedId(m.id);
                  setDetail(null);
                  void (async () => {
                    if (!accessToken) {
                      return;
                    }
                    try {
                      setSentPreview(await fetchSentMessage(accessToken, m.id));
                    } catch {
                      const s = sent.find((x) => x.id === m.id);
                      setSentPreview(
                        s
                          ? {
                              ...s,
                              fromAddress: summary?.primaryAddress ?? "—",
                              bodyText: null,
                              smtpMessageId: null,
                            }
                          : null,
                      );
                    }
                  })();
                  return;
                }
                void openMessage(m.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && view !== "sent") {
                  void openMessage(m.id);
                }
              }}
            >
              <div className="mail-list-from">{m.fromAddress}</div>
              <div className="mail-list-subject">{m.subject}</div>
              <div className="mail-list-snippet">{m.snippet}</div>
            </div>
          ))
        )}
      </section>

      <section className="mail-read">
        {toast ? (
          <p style={{ padding: 12, background: "#e6f4ea", margin: 0 }}>
            {toast}
          </p>
        ) : null}
        {sentPreview ? (
          <>
            <header className="mail-read-header">
              <h1>{sentPreview.subject}</h1>
              <div className="mail-read-meta">
                Kime: {sentPreview.toAddress} ·{" "}
                {new Date(sentPreview.sentAt).toLocaleString("tr-TR")}
              </div>
            </header>
            <div className="mail-read-body">
              <pre>{sentPreview.bodyText ?? "(İçerik yok)"}</pre>
            </div>
          </>
        ) : !detail ? (
          <p className="mail-empty">Okumak için bir mesaj seçin</p>
        ) : (
          <>
            <header className="mail-read-header">
              <h1>{detail.subject}</h1>
              <div className="mail-read-meta">
                Kimden: {detail.fromAddress} ·{" "}
                {new Date(detail.receivedAt).toLocaleString("tr-TR")}
              </div>
            </header>
            <div className="mail-read-body">
              {detail.bodyHtml ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: detail.bodyHtml,
                  }}
                />
              ) : (
                <pre>{detail.bodyText ?? ""}</pre>
              )}
            </div>
            {view !== "sent" ? (
              <div className="mail-reply">
                <textarea
                  placeholder="Yanıt yazın…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button type="button" onClick={() => void sendReply()}>
                  Yanıtla
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {composeOpen ? (
        <div
          className="compose-overlay"
          role="presentation"
          onClick={() => setComposeOpen(false)}
        >
          <div
            className="compose-dialog"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Yeni mesaj</h2>
            <input
              placeholder="Kime"
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value)}
            />
            <input
              placeholder="Konu"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
            />
            <textarea
              placeholder="Mesaj"
              rows={6}
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
            />
            {composeError ? (
              <p className="login-error" style={{ marginBottom: 12 }}>
                {composeError}
              </p>
            ) : null}
            <div className="compose-actions">
              <button type="button" onClick={() => setComposeOpen(false)}>
                İptal
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => void sendCompose()}
              >
                {sending ? "Gönderiliyor…" : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
