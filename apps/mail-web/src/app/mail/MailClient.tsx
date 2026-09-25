"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  composeMail,
  createDraft,
  deleteDraft,
  downloadMailAttachment,
  fetchDrafts,
  fetchInbox,
  fetchMessage,
  fetchSentMessage,
  fileToAttachment,
  markRead,
  replyMail,
  searchInbox,
  sendDraft,
  updateDraft,
  type MailDraftItem,
  type MailInboxListItem,
  type MailInboxMessageDetail,
  type MailInboxSummary,
  type MailSentItem,
  type MailSentMessageDetail,
  type ComposeAttachment,
} from "@/lib/mailApi";
import { useMailSession } from "@/lib/session";
import { MailSettingsPanel } from "./MailSettingsPanel";

type View = "inbox" | "spam" | "sent" | "all" | "drafts";

function inboxFolderForView(view: View): "inbox" | "spam" | "all" {
  if (view === "spam") {
    return "spam";
  }
  if (view === "all") {
    return "all";
  }
  return "inbox";
}

export function MailClient() {
  const router = useRouter();
  const { accessToken, logout } = useMailSession();
  const [view, setView] = useState<View>("inbox");
  const [summary, setSummary] = useState<MailInboxSummary | null>(null);
  const [messages, setMessages] = useState<MailInboxListItem[]>([]);
  const [sent, setSent] = useState<MailSentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MailInboxListItem[] | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailInboxMessageDetail | null>(null);
  const [sentPreview, setSentPreview] = useState<MailSentMessageDetail | null>(
    null,
  );
  const [sentLoading, setSentLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeText, setComposeText] = useState("");
  const [composeFiles, setComposeFiles] = useState<File[]>([]);
  const [composeStoredAttachments, setComposeStoredAttachments] = useState<
    ComposeAttachment[]
  >([]);
  const [toast, setToast] = useState("");
  const [composeError, setComposeError] = useState("");
  const [sending, setSending] = useState(false);
  const [drafts, setDrafts] = useState<MailDraftItem[]>([]);
  const [draftPreview, setDraftPreview] = useState<MailDraftItem | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const folder = inboxFolderForView(view);
    const data = await fetchInbox(accessToken, folder);
    setSummary(data.summary);
    setMessages(data.messages);
    setSent(data.sent);
  }, [accessToken, view]);

  const refreshDrafts = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setDrafts(await fetchDrafts(accessToken));
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    void refresh();
    void refreshDrafts();
  }, [accessToken, refresh, refreshDrafts, router]);

  useEffect(() => {
    if (accessToken && view === "drafts") {
      void refreshDrafts();
    }
  }, [accessToken, refreshDrafts, view]);

  useEffect(() => {
    if (!accessToken || view === "sent" || view === "drafts") {
      setSearchResults(null);
      return;
    }
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        const folder = inboxFolderForView(view);
        const data = await searchInbox(accessToken, q, folder);
        setSearchResults(data.messages);
      })();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [accessToken, searchQuery, view]);

  async function openMessage(id: string) {
    if (!accessToken) {
      return;
    }
    setSelectedId(id);
    setSentPreview(null);
    const message = await fetchMessage(accessToken, id);
    setDetail(message);
    setReplyText("");
    setReplyFiles([]);
    if (!message.readAt) {
      await markRead(accessToken, id);
      void refresh();
    }
  }

  async function downloadAttachment(index: number, filename: string) {
    if (!accessToken || !detail) {
      return;
    }
    try {
      const blob = await downloadMailAttachment(accessToken, detail.id, index);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast("Ek indirilemedi.");
    }
  }

  async function sendReply() {
    if (!accessToken || !selectedId || !replyText.trim()) {
      return;
    }
    try {
      const attachments =
        replyFiles.length > 0
          ? await Promise.all(replyFiles.map((f) => fileToAttachment(f)))
          : undefined;
      await replyMail(accessToken, selectedId, {
        text: replyText.trim(),
        attachments,
      });
      setToast("Yanıt gönderildi.");
      setReplyText("");
      setReplyFiles([]);
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Yanıt gönderilemedi.",
      );
    }
  }

  function openComposeFromDraft(draft: MailDraftItem) {
    setEditingDraftId(draft.id);
    setComposeTo(draft.to ?? "");
    setComposeSubject(draft.subject ?? "");
    setComposeText(draft.text ?? "");
    setComposeFiles([]);
    setComposeStoredAttachments(draft.attachments ?? []);
    setComposeError("");
    setComposeOpen(true);
  }

  async function saveComposeDraft() {
    if (!accessToken) {
      return;
    }
    setComposeError("");
    setSending(true);
    try {
      const fileAttachments =
        composeFiles.length > 0
          ? await Promise.all(composeFiles.map((f) => fileToAttachment(f)))
          : [];
      const attachments = [...composeStoredAttachments, ...fileAttachments];
      const body = {
        to: composeTo.trim() || undefined,
        subject: composeSubject.trim() || undefined,
        text: composeText || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      };
      if (editingDraftId) {
        await updateDraft(accessToken, editingDraftId, body);
      } else {
        const created = await createDraft(accessToken, body);
        setEditingDraftId(created.id);
      }
      setToast("Taslak kaydedildi.");
      void refreshDrafts();
    } catch (error) {
      setComposeError(
        error instanceof Error ? error.message : "Taslak kaydedilemedi.",
      );
    } finally {
      setSending(false);
    }
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
      if (editingDraftId) {
        const fileAttachments =
          composeFiles.length > 0
            ? await Promise.all(composeFiles.map((f) => fileToAttachment(f)))
            : [];
        const attachments = [...composeStoredAttachments, ...fileAttachments];
        await updateDraft(accessToken, editingDraftId, {
          to: composeTo.trim(),
          subject: composeSubject.trim(),
          text: composeText,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        await sendDraft(accessToken, editingDraftId);
      } else {
        const fileAttachments =
          composeFiles.length > 0
            ? await Promise.all(composeFiles.map((f) => fileToAttachment(f)))
            : [];
        const attachments = [...composeStoredAttachments, ...fileAttachments];
        await composeMail(accessToken, {
          to: composeTo.trim(),
          subject: composeSubject.trim(),
          text: composeText,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
      }
      setComposeOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeText("");
    setComposeFiles([]);
    setComposeStoredAttachments([]);
    setEditingDraftId(null);
      setToast("Gönderildi.");
      setView("sent");
      void refresh();
      void refreshDrafts();
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

  const filteredSent = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || view !== "sent") {
      return sent;
    }
    return sent.filter(
      (s) =>
        s.subject.toLowerCase().includes(q) ||
        s.toAddress.toLowerCase().includes(q),
    );
  }, [sent, searchQuery, view]);

  const listItems =
    view === "drafts"
      ? drafts.map((d) => ({
          id: d.id,
          fromAddress: "Taslak",
          subject: d.subject || "(Konu yok)",
          snippet: d.to || "—",
          receivedAt: d.updatedAt,
          readAt: d.updatedAt,
          spamStatus: "clean",
          attachmentCount: d.attachments.length,
        }))
      : view === "sent"
      ? filteredSent.map((s) => ({
          id: s.id,
          fromAddress: "Gönderilen",
          subject: s.subject,
          snippet: s.toAddress,
          receivedAt: s.sentAt,
          readAt: s.sentAt,
          spamStatus: "clean",
          attachmentCount: 0,
        }))
      : searchResults ?? messages;

  function switchView(next: View) {
    setView(next);
    setDetail(null);
    setSentPreview(null);
    setSelectedId(null);
    setSearchQuery("");
    setSearchResults(null);
    setDraftPreview(null);
    if (next === "drafts") {
      void refreshDrafts();
    }
  }

  function resetCompose() {
    setEditingDraftId(null);
    setComposeTo("");
    setComposeSubject("");
    setComposeText("");
    setComposeFiles([]);
    setComposeStoredAttachments([]);
    setComposeError("");
  }

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
            resetCompose();
            setComposeOpen(true);
          }}
        >
          Yaz
        </button>
        <nav className="mail-nav">
          <button
            type="button"
            className={view === "inbox" ? "active" : ""}
            onClick={() => switchView("inbox")}
          >
            Gelen
            {summary && summary.unreadCount > 0
              ? ` (${summary.unreadCount})`
              : ""}
          </button>
          <button
            type="button"
            className={view === "sent" ? "active" : ""}
            onClick={() => switchView("sent")}
          >
            Gönderilen
          </button>
          <button
            type="button"
            className={view === "all" ? "active" : ""}
            onClick={() => switchView("all")}
          >
            Tümü
          </button>
          <button
            type="button"
            className={view === "spam" ? "active" : ""}
            onClick={() => switchView("spam")}
          >
            Spam
          </button>
          <button
            type="button"
            className={view === "drafts" ? "active" : ""}
            onClick={() => switchView("drafts")}
          >
            Taslaklar
            {drafts.length > 0 ? ` (${drafts.length})` : ""}
          </button>
        </nav>
        <button
          type="button"
          className="mail-nav-imap"
          onClick={() => setSettingsOpen(true)}
        >
          IMAP ayarları
        </button>
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
        {view !== "drafts" ? (
          <div className="mail-search">
            <input
              type="search"
              placeholder="Ara (konu, gönderen)…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Posta ara"
            />
          </div>
        ) : null}
        {listItems.length === 0 ? (
          <p className="mail-empty">Mesaj yok</p>
        ) : (
          listItems.map((m) => (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              className={`mail-list-item ${selectedId === m.id ? "selected" : ""} ${!m.readAt && (view === "inbox" || view === "all" || view === "spam") ? "unread" : ""}`}
              onClick={() => {
                if (view === "drafts") {
                  const d = drafts.find((x) => x.id === m.id);
                  if (d) {
                    setSelectedId(m.id);
                    setDraftPreview(d);
                    setDetail(null);
                    setSentPreview(null);
                  }
                  return;
                }
                if (view === "sent") {
                  setSelectedId(m.id);
                  setDetail(null);
                  setSentLoading(true);
                  setSentPreview(null);
                  void (async () => {
                    if (!accessToken) {
                      return;
                    }
                    try {
                      setSentPreview(
                        await fetchSentMessage(accessToken, m.id),
                      );
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
                    } finally {
                      setSentLoading(false);
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
              <div className="mail-list-from">
                {m.fromAddress}
                {(m.attachmentCount ?? 0) > 0 ? " 📎" : ""}
              </div>
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
        {sentLoading ? (
          <p className="mail-empty">Yükleniyor…</p>
        ) : sentPreview ? (
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
        ) : draftPreview ? (
          <>
            <header className="mail-read-header">
              <h1>{draftPreview.subject || "(Konu yok)"}</h1>
              <div className="mail-read-meta">
                Kime: {draftPreview.to ?? "—"} · Güncellendi:{" "}
                {new Date(draftPreview.updatedAt).toLocaleString("tr-TR")}
              </div>
            </header>
            <div className="mail-read-body">
              <pre>{draftPreview.text ?? ""}</pre>
            </div>
            {draftPreview.attachments.length > 0 ? (
              <ul className="mail-attachments">
                {draftPreview.attachments.map((file) => (
                  <li key={file.filename}>{file.filename}</li>
                ))}
              </ul>
            ) : null}
            <div className="mail-reply">
              <button
                type="button"
                onClick={() => openComposeFromDraft(draftPreview)}
              >
                Düzenle
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!accessToken) {
                    return;
                  }
                  void (async () => {
                    try {
                      await sendDraft(accessToken, draftPreview.id);
                      setToast("Gönderildi.");
                      setDraftPreview(null);
                      setSelectedId(null);
                      void refresh();
                      void refreshDrafts();
                      setView("sent");
                    } catch (error) {
                      setToast(
                        error instanceof Error
                          ? error.message
                          : "Gönderilemedi.",
                      );
                    }
                  })();
                }}
              >
                Gönder
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!accessToken) {
                    return;
                  }
                  void (async () => {
                    await deleteDraft(accessToken, draftPreview.id);
                    setDraftPreview(null);
                    setSelectedId(null);
                    void refreshDrafts();
                  })();
                }}
              >
                Sil
              </button>
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
                {detail.spamReason ? ` · ${detail.spamReason}` : ""}
              </div>
            </header>
            {detail.attachments.length > 0 ? (
              <ul className="mail-attachments">
                {detail.attachments.map((file) => (
                  <li key={file.index}>
                    <button
                      type="button"
                      onClick={() =>
                        void downloadAttachment(file.index, file.filename)
                      }
                    >
                      {file.filename} ({Math.round(file.sizeBytes / 1024)} KB)
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mail-read-body">
              {detail.bodyHtml ? (
                <iframe
                  title="Mesaj içeriği"
                  className="mail-html-frame"
                  sandbox=""
                  srcDoc={detail.bodyHtml}
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
                <input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setReplyFiles(Array.from(e.target.files ?? []))
                  }
                />
                {replyFiles.length > 0 ? (
                  <p className="mail-attach-hint">
                    {replyFiles.length} ek seçildi (en fazla 3, 2 MB)
                  </p>
                ) : null}
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
            <h2>{editingDraftId ? "Taslak" : "Yeni mesaj"}</h2>
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
            <input
              type="file"
              multiple
              onChange={(e) =>
                setComposeFiles(Array.from(e.target.files ?? []))
              }
            />
            {composeStoredAttachments.length > 0 ? (
              <ul className="mail-attachments">
                {composeStoredAttachments.map((file) => (
                  <li key={file.filename}>{file.filename} (taslakta)</li>
                ))}
              </ul>
            ) : null}
            {composeFiles.length > 0 ? (
              <p className="mail-attach-hint">
                {composeFiles.length} yeni ek seçildi
              </p>
            ) : null}
            {composeError ? (
              <p className="login-error" style={{ marginBottom: 12 }}>
                {composeError}
              </p>
            ) : null}
            <div className="compose-actions">
              <button
                type="button"
                onClick={() => {
                  setComposeOpen(false);
                  resetCompose();
                }}
              >
                İptal
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => void saveComposeDraft()}
              >
                Taslak kaydet
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
      {settingsOpen && accessToken ? (
        <MailSettingsPanel
          accessToken={accessToken}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </div>
  );
}
