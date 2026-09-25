"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  composeMail,
  createDraft,
  deleteDraft,
  downloadMailAttachment,
  fetchComposePresets,
  fetchDrafts,
  fetchInbox,
  fetchInboxThreads,
  fetchMessage,
  fetchThreadMessages,
  fetchSentMessage,
  fileToAttachment,
  markRead,
  replyMail,
  searchInbox,
  sendDraft,
  setMessageMailboxFolder,
  deleteMessagePermanently,
  updateDraft,
  type MailComposePreset,
  type MailDraftItem,
  type MailInboxFolder,
  type MailMailboxFolder,
  type MailInboxListItem,
  type MailInboxMessageDetail,
  type MailInboxSummary,
  type MailInboxThreadRow,
  type MailSentItem,
  type MailSentMessageDetail,
  type ComposeAttachment,
} from "@/lib/mailApi";
import { useMailSession } from "@/lib/session";
import { MailSettingsPanel } from "./MailSettingsPanel";

type View =
  | "inbox"
  | "spam"
  | "sent"
  | "all"
  | "archive"
  | "trash"
  | "drafts";

function inboxFolderForView(view: View): MailInboxFolder {
  if (view === "spam") {
    return "spam";
  }
  if (view === "all") {
    return "all";
  }
  if (view === "archive") {
    return "archive";
  }
  if (view === "trash") {
    return "trash";
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
  const [threadView, setThreadView] = useState(false);
  const [threads, setThreads] = useState<MailInboxThreadRow[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<MailInboxListItem[]>(
    [],
  );
  const [mobilePane, setMobilePane] = useState<"nav" | "list" | "read">(
    "list",
  );
  const [composeSignatures, setComposeSignatures] = useState<
    MailComposePreset[]
  >([]);
  const [composeTemplates, setComposeTemplates] = useState<
    MailComposePreset[]
  >([]);

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
    if (!composeOpen || !accessToken) {
      return;
    }
    void fetchComposePresets(accessToken).then((data) => {
      setComposeSignatures(data.signatures);
      setComposeTemplates(data.templates);
    });
  }, [composeOpen, accessToken]);

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
    setMobilePane("read");
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

  const inboxFolder = inboxFolderForView(view);
  const canUseThreads =
    view === "inbox" ||
    view === "spam" ||
    view === "all" ||
    view === "archive";

  async function moveCurrentMessage(folder: MailMailboxFolder) {
    if (!accessToken || !selectedId) {
      return;
    }
    try {
      await setMessageMailboxFolder(accessToken, selectedId, folder);
      setToast(
        folder === "trash"
          ? "Çöp kutusuna taşındı."
          : folder === "archive"
            ? "Arşivlendi."
            : "Gelen kutusuna alındı.",
      );
      setDetail(null);
      setSelectedId(null);
      setActiveThreadId(null);
      setThreadMessages([]);
      setMobilePane("list");
      void refresh();
      if (threadView && canUseThreads) {
        void fetchInboxThreads(accessToken, inboxFolder).then((data) => {
          setThreads(data.threads);
        });
      }
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Klasör değiştirilemedi.",
      );
    }
  }

  async function purgeCurrentMessage() {
    if (!accessToken || !selectedId) {
      return;
    }
    try {
      await deleteMessagePermanently(accessToken, selectedId);
      setToast("Kalıcı olarak silindi.");
      setDetail(null);
      setSelectedId(null);
      setMobilePane("list");
      void refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Silinemedi.");
    }
  }

  useEffect(() => {
    if (!accessToken || !threadView || !canUseThreads) {
      setThreads([]);
      return;
    }
    void fetchInboxThreads(accessToken, inboxFolder).then((data) => {
      setThreads(data.threads);
    });
  }, [accessToken, threadView, inboxFolder, canUseThreads]);

  const listItems =
    threadView && canUseThreads
      ? threads.map((t) => ({
          id: t.latestMessageId,
          threadId: t.threadId,
          fromAddress: t.fromAddress,
          subject:
            t.messageCount > 1
              ? `${t.subject} (${t.messageCount})`
              : t.subject,
          snippet: t.snippet,
          receivedAt: t.receivedAt,
          readAt: t.unreadCount > 0 ? null : t.receivedAt,
          spamStatus: "clean",
          attachmentCount: 0,
        }))
      : view === "drafts"
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
    setActiveThreadId(null);
    setThreadMessages([]);
    setMobilePane("list");
    if (next === "drafts") {
      void refreshDrafts();
    }
  }

  async function openThread(threadId: string, latestMessageId: string) {
    if (!accessToken) {
      return;
    }
    setActiveThreadId(threadId);
    const data = await fetchThreadMessages(accessToken, threadId, inboxFolder);
    setThreadMessages(data.messages);
    await openMessage(latestMessageId);
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

  function applyComposeTemplate(presetId: string) {
    const preset = composeTemplates.find((t) => t.id === presetId);
    if (!preset) {
      return;
    }
    if (preset.subject) {
      setComposeSubject(preset.subject);
    }
    setComposeText(preset.bodyText);
  }

  function applyComposeSignature(presetId: string) {
    const preset = composeSignatures.find((s) => s.id === presetId);
    if (!preset) {
      return;
    }
    const block = `\n\n--\n${preset.bodyText}`;
    setComposeText((prev) =>
      prev.trim() ? `${prev.replace(/\s+$/, "")}${block}` : preset.bodyText,
    );
  }

  return (
    <div className={`mail-app mobile-pane-${mobilePane}`}>
      <div className="mail-mobile-bar">
        <button type="button" onClick={() => setMobilePane("nav")}>
          Menü
        </button>
        <button type="button" onClick={() => setMobilePane("list")}>
          Liste
        </button>
        {selectedId ? (
          <button type="button" onClick={() => setMobilePane("read")}>
            Mesaj
          </button>
        ) : null}
      </div>
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
            {summary && summary.spamCount > 0 ? ` (${summary.spamCount})` : ""}
          </button>
          <button
            type="button"
            className={view === "archive" ? "active" : ""}
            onClick={() => switchView("archive")}
          >
            Arşiv
            {summary && (summary.archiveCount ?? 0) > 0
              ? ` (${summary.archiveCount})`
              : ""}
          </button>
          <button
            type="button"
            className={view === "trash" ? "active" : ""}
            onClick={() => switchView("trash")}
          >
            Çöp
            {summary && (summary.trashCount ?? 0) > 0
              ? ` (${summary.trashCount})`
              : ""}
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
          Ayarlar
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
            {canUseThreads ? (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                }}
              >
                <input
                  type="checkbox"
                  checked={threadView}
                  onChange={(e) => setThreadView(e.target.checked)}
                />
                Konuşma görünümü
              </label>
            ) : null}
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
              className={`mail-list-item ${selectedId === m.id ? "selected" : ""} ${!m.readAt && (view === "inbox" || view === "all" || view === "spam" || view === "archive") ? "unread" : ""}`}
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
                if (threadView && canUseThreads && "threadId" in m) {
                  void openThread(
                    (m as { threadId: string }).threadId,
                    m.id,
                  );
                  return;
                }
                void openMessage(m.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && view !== "sent") {
                  if (threadView && canUseThreads && "threadId" in m) {
                    void openThread(
                      (m as { threadId: string }).threadId,
                      m.id,
                    );
                    return;
                  }
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
              <button
                type="button"
                className="mail-back-read"
                onClick={() => {
                  setMobilePane("list");
                  setDetail(null);
                  setSelectedId(null);
                  setActiveThreadId(null);
                  setThreadMessages([]);
                }}
              >
                ← Liste
              </button>
              {activeThreadId && threadMessages.length > 1 ? (
                <div className="mail-thread-stack" role="list">
                  {threadMessages.map((tm) => (
                    <button
                      key={tm.id}
                      type="button"
                      role="listitem"
                      className={
                        selectedId === tm.id ? "active" : undefined
                      }
                      onClick={() => void openMessage(tm.id)}
                    >
                      <span className="mail-thread-stack-from">
                        {tm.fromAddress}
                      </span>
                      <span className="mail-thread-stack-date">
                        {new Date(tm.receivedAt).toLocaleString("tr-TR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
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
            <div className="mail-folder-actions">
              {view === "trash" || detail.mailboxFolder === "trash" ? (
                <>
                  <button
                    type="button"
                    onClick={() => void moveCurrentMessage("inbox")}
                  >
                    Geri al
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => void purgeCurrentMessage()}
                  >
                    Kalıcı sil
                  </button>
                </>
              ) : (
                <>
                  {view !== "archive" && detail.mailboxFolder !== "archive" ? (
                    <button
                      type="button"
                      onClick={() => void moveCurrentMessage("archive")}
                    >
                      Arşivle
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void moveCurrentMessage("inbox")}
                    >
                      Gelen kutusuna taşı
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void moveCurrentMessage("trash")}
                  >
                    Sil
                  </button>
                </>
              )}
            </div>
            {view !== "sent" && view !== "trash" ? (
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
            <div className="compose-preset-row">
              <label>
                Şablon
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      applyComposeTemplate(e.target.value);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">Seç…</option>
                  {composeTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <label>
                İmza
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      applyComposeSignature(e.target.value);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">Ekle…</option>
                  {composeSignatures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.isDefault ? " ★" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
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
