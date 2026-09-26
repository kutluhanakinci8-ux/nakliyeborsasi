"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { syncMailUnreadBadge } from "@/lib/mailUnreadBadge";
import { useRouter, useSearchParams } from "next/navigation";
import {
  cancelDelayedCompose,
  fetchDelayedComposeStatus,
  composeMail,
  createDraft,
  deleteDraft,
  downloadMailAttachment,
  fetchComposePresets,
  fetchDrafts,
  fetchInbox,
  fetchCustomFolders,
  createCustomFolder,
  deleteCustomFolder,
  renameCustomFolder,
  bulkSetMessageCustomFolder,
  fetchInboxThreads,
  fetchMessage,
  fetchThreadMessages,
  fetchSentMessage,
  fileToAttachment,
  markRead,
  markUnread,
  bulkMarkRead,
  bulkMarkUnread,
  bulkSetMessageMailboxFolder,
  bulkSetMessageStarred,
  bulkSnoozeMailMessages,
  replyMail,
  snoozeMailMessage,
  unsnoozeMailMessage,
  forwardMail,
  fetchMailInboxBranding,
  type MailInboxBranding,
  searchInbox,
  sendDraft,
  setMessageMailboxFolder,
  setMessageStarred,
  deleteMessagePermanently,
  updateDraft,
  type MailComposePreset,
  type MailDraftItem,
  type MailInboxFolder,
  type MailMailboxFolder,
  type MailInboxListItem,
  type MailInboxMessageDetail,
  type MailInboxSummary,
  type MailCustomFolder,
  type MailInboxThreadRow,
  type MailSentItem,
  type MailSentMessageDetail,
  type ComposeAttachment,
} from "@/lib/mailApi";
import { useMailSession } from "@/lib/session";
import { MailSettingsPanel } from "./MailSettingsPanel";
import { MailEmptyState } from "./MailEmptyState";
import { MailShortcutsDialog } from "./MailShortcutsDialog";
import { MailCalendarPanel } from "./MailCalendarPanel";
import { MailContactsPanel } from "./MailContactsPanel";
import { useMailKeyboardShortcuts } from "./useMailKeyboardShortcuts";
import { ComposeRichEditor } from "./ComposeRichEditor";
import { MailInboxMessageRow } from "./MailInboxMessageRow";

type View =
  | "inbox"
  | "spam"
  | "sent"
  | "all"
  | "archive"
  | "trash"
  | "starred"
  | "snoozed"
  | "drafts"
  | "calendar"
  | "contacts";

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
  if (view === "starred") {
    return "starred";
  }
  if (view === "snoozed") {
    return "snoozed";
  }
  return "inbox";
}

export function MailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkMessageHandled = useRef(false);
  const { accessToken, logout } = useMailSession();
  const [view, setView] = useState<View>("inbox");
  const [summary, setSummary] = useState<MailInboxSummary | null>(null);
  const [messages, setMessages] = useState<MailInboxListItem[]>([]);
  const [sent, setSent] = useState<MailSentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFrom, setSearchFrom] = useState("");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [searchHasAttachment, setSearchHasAttachment] = useState<
    "any" | "yes" | "no"
  >("any");
  const [searchFiltersOpen, setSearchFiltersOpen] = useState(false);
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
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [composeShowCcBcc, setComposeShowCcBcc] = useState(false);
  const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);
  const [replyBcc, setReplyBcc] = useState("");
  const [replyAllMode, setReplyAllMode] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeText, setComposeText] = useState("");
  const [composeFiles, setComposeFiles] = useState<File[]>([]);
  const [composeStoredAttachments, setComposeStoredAttachments] = useState<
    ComposeAttachment[]
  >([]);
  const [toast, setToast] = useState("");
  const [pendingUndo, setPendingUndo] = useState<{
    pendingId: string;
    sendAt: number;
  } | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
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
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const checkboxAnchorRef = useRef<string | null>(null);
  const [inboxBranding, setInboxBranding] = useState<MailInboxBranding | null>(
    null,
  );
  const [composeRich, setComposeRich] = useState(false);
  const [composeHtml, setComposeHtml] = useState("");
  const [customFolders, setCustomFolders] = useState<MailCustomFolder[]>([]);
  const [activeCustomFolderId, setActiveCustomFolderId] = useState<
    string | null
  >(null);

  const inboxCustomFolderId =
    view === "inbox" ? activeCustomFolderId : null;

  const isPrimaryInbox = view === "inbox" && !activeCustomFolderId;

  const refreshCustomFolders = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const data = await fetchCustomFolders(accessToken);
    setCustomFolders(data.folders);
  }, [accessToken]);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    if (view === "calendar" || view === "contacts") {
      const data = await fetchInbox(accessToken, "inbox");
      setSummary(data.summary);
      return;
    }
    const folder = inboxFolderForView(view);
    const data = await fetchInbox(
      accessToken,
      folder,
      folder === "inbox" ? inboxCustomFolderId : undefined,
    );
    setSummary(data.summary);
    setMessages(data.messages);
    setSent(data.sent);
  }, [accessToken, view, inboxCustomFolderId]);

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
    void fetchMailInboxBranding(accessToken)
      .then((data) => setInboxBranding(data.branding))
      .catch(() => setInboxBranding(null));
    void refreshCustomFolders();
  }, [accessToken, refresh, refreshDrafts, refreshCustomFolders, router]);

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
    if (!pendingUndo) {
      setUndoSecondsLeft(0);
      return;
    }
    let settled = false;
    const settleDelayedSend = async (pendingId: string) => {
      if (!accessToken || settled) {
        return;
      }
      settled = true;
      const poll = async (attempt: number): Promise<void> => {
        try {
          const status = await fetchDelayedComposeStatus(accessToken, pendingId);
          if (status.status === "pending" && attempt < 12) {
            await new Promise((r) => window.setTimeout(r, 500));
            return poll(attempt + 1);
          }
          setPendingUndo(null);
          if (status.status === "sent") {
            setToast("Gönderildi.");
            setView("sent");
            void refresh();
            void refreshDrafts();
            return;
          }
          if (status.status === "failed") {
            setToast(status.errorMessage ?? "Gönderilemedi.");
            return;
          }
          if (status.status === "cancelled") {
            setToast("Gönderim iptal edildi.");
            return;
          }
          setToast("Gönderim durumu alınamadı — Gönderilen klasörünü kontrol edin.");
        } catch {
          setPendingUndo(null);
          setToast("Gönderim doğrulanamadı.");
        }
      };
      await poll(0);
    };
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((pendingUndo.sendAt - Date.now()) / 1000),
      );
      setUndoSecondsLeft(left);
      if (left <= 0) {
        void settleDelayedSend(pendingUndo.pendingId);
      }
    };
    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, [pendingUndo, refresh, refreshDrafts, accessToken]);

  useEffect(() => {
    syncMailUnreadBadge(summary?.unreadCount ?? 0);
  }, [summary?.unreadCount]);

  function applyDelayedSend(
    result:
      | { delayed?: boolean; pendingId?: string; sendAt?: string }
      | { ok?: boolean },
  ): boolean {
    if (
      "delayed" in result &&
      result.delayed &&
      result.pendingId &&
      result.sendAt
    ) {
      setPendingUndo({
        pendingId: result.pendingId,
        sendAt: new Date(result.sendAt).getTime(),
      });
      setToast("");
      return true;
    }
    return false;
  }

  async function cancelPendingUndo() {
    if (!accessToken || !pendingUndo) {
      return;
    }
    try {
      await cancelDelayedCompose(accessToken, pendingUndo.pendingId);
      setPendingUndo(null);
      setToast("Gönderim iptal edildi.");
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Geri alınamadı.",
      );
    }
  }

  const searchActive = useMemo(() => {
    if (searchQuery.trim().length >= 2) {
      return true;
    }
    if (searchFrom.trim().length > 0) {
      return true;
    }
    if (searchDateFrom || searchDateTo) {
      return true;
    }
    if (searchHasAttachment !== "any") {
      return true;
    }
    return false;
  }, [
    searchQuery,
    searchFrom,
    searchDateFrom,
    searchDateTo,
    searchHasAttachment,
  ]);

  useEffect(() => {
    if (
      !accessToken ||
      view === "sent" ||
      view === "drafts" ||
      view === "calendar" ||
      view === "contacts"
    ) {
      setSearchResults(null);
      return;
    }
    if (!searchActive) {
      setSearchResults(null);
      return;
    }
    setSearchResults(null);
    const timer = window.setTimeout(() => {
      void (async () => {
        const folder = inboxFolderForView(view);
        const data = await searchInbox(
          accessToken,
          folder,
          {
            q: searchQuery.trim(),
            from: searchFrom.trim(),
            receivedAfter: searchDateFrom || undefined,
            receivedBefore: searchDateTo || undefined,
            hasAttachment:
              searchHasAttachment === "yes"
                ? true
                : searchHasAttachment === "no"
                  ? false
                  : undefined,
          },
          folder === "inbox" ? inboxCustomFolderId : undefined,
        );
        setSearchResults(data.messages);
      })();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    accessToken,
    searchQuery,
    searchFrom,
    searchDateFrom,
    searchDateTo,
    searchHasAttachment,
    searchActive,
    view,
    inboxCustomFolderId,
  ]);

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

  useEffect(() => {
    const messageId = searchParams.get("message");
    if (!accessToken || !messageId || deepLinkMessageHandled.current) {
      return;
    }
    deepLinkMessageHandled.current = true;
    void openMessage(messageId);
  }, [accessToken, searchParams]);

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

  async function sendReply(replyAll?: boolean) {
    if (!accessToken || !selectedId || !replyText.trim()) {
      return;
    }
    const useReplyAll = replyAll ?? replyAllMode;
    try {
      const attachments =
        replyFiles.length > 0
          ? await Promise.all(replyFiles.map((f) => fileToAttachment(f)))
          : undefined;
      const replyResult = await replyMail(accessToken, selectedId, {
        text: replyText.trim(),
        bcc: replyBcc.trim() || undefined,
        replyAll: useReplyAll,
        attachments,
        delaySeconds: 5,
      });
      setReplyText("");
      setReplyFiles([]);
      setReplyAllMode(false);
      if (applyDelayedSend(replyResult)) {
        return;
      }
      setToast(useReplyAll ? "Tümüne yanıt gönderildi." : "Yanıt gönderildi.");
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Yanıt gönderilemedi.",
      );
    }
  }

  async function snoozeSelected(hours: number) {
    if (!accessToken || !selectedId) {
      return;
    }
    const until = new Date(Date.now() + hours * 60 * 60 * 1000);
    try {
      await snoozeMailMessage(accessToken, selectedId, until.toISOString());
      setToast(`Ertelendi (${hours} saat).`);
      setDetail(null);
      setSelectedId(null);
      void refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Ertelenemedi.");
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
    if (forwardMessageId) {
      if (!composeTo.trim()) {
        setComposeError("İletmek için alıcı (Kime) zorunlu.");
        return;
      }
    } else if (
      !composeTo.trim() ||
      !composeSubject.trim() ||
      !composeText.trim()
    ) {
      setComposeError("Kime, konu ve mesaj zorunlu.");
      return;
    }
    const outboundHtml =
      composeRich && composeHtml.trim() && !forwardMessageId
        ? composeHtml.trim()
        : undefined;
    setComposeError("");
    setSending(true);
    let scheduledUndo = false;
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
        const draftResult = await sendDraft(accessToken, editingDraftId, {
          delaySeconds: 5,
        });
        if (applyDelayedSend(draftResult)) {
          scheduledUndo = true;
        }
      } else {
        const fileAttachments =
          composeFiles.length > 0
            ? await Promise.all(composeFiles.map((f) => fileToAttachment(f)))
            : [];
        const attachments = [...composeStoredAttachments, ...fileAttachments];
        if (forwardMessageId) {
          const forwardResult = await forwardMail(
            accessToken,
            forwardMessageId,
            {
              to: composeTo.trim(),
              text: composeText.trim() || undefined,
              includeOriginal: true,
              attachments: attachments.length > 0 ? attachments : undefined,
              delaySeconds: 5,
            },
          );
          if (applyDelayedSend(forwardResult)) {
            scheduledUndo = true;
          }
        } else {
          const result = await composeMail(accessToken, {
            to: composeTo.trim(),
            cc: composeCc.trim() || undefined,
            bcc: composeBcc.trim() || undefined,
            subject: composeSubject.trim(),
            text: composeText,
            html: outboundHtml,
            attachments: attachments.length > 0 ? attachments : undefined,
            delaySeconds: 5,
          });
          if (applyDelayedSend(result)) {
            scheduledUndo = true;
          }
        }
      }
      setComposeOpen(false);
      setForwardMessageId(null);
      setComposeTo("");
      setComposeCc("");
      setComposeBcc("");
      setComposeSubject("");
      setComposeText("");
      setComposeFiles([]);
      setComposeStoredAttachments([]);
      setEditingDraftId(null);
      if (!scheduledUndo) {
        setToast("Gönderildi.");
        setView("sent");
        void refresh();
      }
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
  const maxAttachmentMb = useMemo(() => {
    const bytes = summary?.storageQuota?.maxAttachmentBytes ?? 2 * 1024 * 1024;
    return Math.max(1, Math.round(bytes / (1024 * 1024)));
  }, [summary?.storageQuota?.maxAttachmentBytes]);
  const canUseThreads =
    !activeCustomFolderId &&
    (view === "inbox" ||
      view === "spam" ||
      view === "all" ||
      view === "archive" ||
      view === "starred");

  const canBulkSelect =
    view === "inbox" ||
    view === "spam" ||
    view === "all" ||
    view === "archive" ||
    view === "starred" ||
    view === "trash";

  useEffect(() => {
    setCheckedIds(new Set());
  }, [view]);

  async function runBulkMarkRead(unread: boolean) {
    if (!accessToken || checkedIds.size === 0) {
      return;
    }
    const messageIds = [...checkedIds];
    try {
      const result = unread
        ? await bulkMarkUnread(accessToken, messageIds)
        : await bulkMarkRead(accessToken, messageIds);
      setToast(
        unread
          ? `${result.updated} mesaj okunmadı işaretlendi.`
          : `${result.updated} mesaj okundu.`,
      );
      setCheckedIds(new Set());
      void refresh();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Toplu işlem başarısız.",
      );
    }
  }

  async function runBulkCustomFolder(customFolderId: string | null) {
    if (!accessToken || checkedIds.size === 0) {
      return;
    }
    const messageIds = [...checkedIds];
    try {
      await bulkSetMessageCustomFolder(
        accessToken,
        messageIds,
        customFolderId,
      );
      setToast(
        customFolderId
          ? `${messageIds.length} mesaj klasöre taşındı.`
          : `${messageIds.length} mesaj gelen kutusuna alındı.`,
      );
      setCheckedIds(new Set());
      void refresh();
      void refreshCustomFolders();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Klasör değiştirilemedi.",
      );
    }
  }

  async function runBulkStar(starred: boolean) {
    if (!accessToken || checkedIds.size === 0) {
      return;
    }
    const messageIds = [...checkedIds];
    try {
      const result = await bulkSetMessageStarred(
        accessToken,
        messageIds,
        starred,
      );
      setToast(
        starred
          ? `${result.updated} mesaj yıldızlandı.`
          : `${result.updated} mesajdan yıldız kaldırıldı.`,
      );
      setCheckedIds(new Set());
      if (view === "starred" && !starred) {
        setDetail(null);
        setSelectedId(null);
      }
      void refresh();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Toplu yıldız başarısız.",
      );
    }
  }

  async function runBulkSnooze(hours: number) {
    if (!accessToken || checkedIds.size === 0) {
      return;
    }
    const messageIds = [...checkedIds];
    const until = new Date(Date.now() + hours * 60 * 60 * 1000);
    try {
      const result = await bulkSnoozeMailMessages(
        accessToken,
        messageIds,
        until.toISOString(),
      );
      setToast(`${result.updated} mesaj ${hours} saat ertelendi.`);
      setCheckedIds(new Set());
      setDetail(null);
      setSelectedId(null);
      void refresh();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Toplu erteleme başarısız.",
      );
    }
  }

  async function runBulkFolder(folder: MailMailboxFolder) {
    if (!accessToken || checkedIds.size === 0) {
      return;
    }
    const messageIds = [...checkedIds];
    try {
      await bulkSetMessageMailboxFolder(accessToken, messageIds, folder);
      setToast(
        folder === "trash"
          ? `${messageIds.length} mesaj çöpe taşındı.`
          : folder === "archive"
            ? `${messageIds.length} mesaj arşivlendi.`
            : `${messageIds.length} mesaj gelen kutusuna alındı.`,
      );
      setCheckedIds(new Set());
      setDetail(null);
      setSelectedId(null);
      void refresh();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Klasör değiştirilemedi.",
      );
    }
  }

  async function toggleMessageStarred(
    messageId: string,
    starred: boolean,
  ) {
    if (!accessToken) {
      return;
    }
    try {
      const result = await setMessageStarred(accessToken, messageId, starred);
      if (detail?.id === messageId) {
        setDetail({ ...detail, starredAt: result.starredAt });
      }
      if (view === "starred" && !starred && selectedId === messageId) {
        setDetail(null);
        setSelectedId(null);
        setMobilePane("list");
      }
      setToast(starred ? "Yıldızlandı." : "Yıldız kaldırıldı.");
      void refresh();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Yıldız güncellenemedi.",
      );
    }
  }

  function toggleCurrentStarred() {
    if (!detail || detail.mailboxFolder === "trash") {
      return;
    }
    const starred = Boolean(detail.starredAt);
    void toggleMessageStarred(detail.id, !starred);
  }

  async function markCurrentUnread() {
    if (!accessToken || !selectedId || !detail) {
      return;
    }
    try {
      await markUnread(accessToken, selectedId);
      setDetail({ ...detail, readAt: null });
      setToast("Okunmadı işaretlendi.");
      void refresh();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Güncellenemedi.",
      );
    }
  }

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
        void fetchInboxThreads(
          accessToken,
          inboxFolder,
          inboxCustomFolderId,
        ).then((data) => {
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
    void fetchInboxThreads(
      accessToken,
      inboxFolder,
      inboxCustomFolderId,
    ).then((data) => {
      setThreads(data.threads);
    });
  }, [accessToken, threadView, inboxFolder, inboxCustomFolderId, canUseThreads]);

  const listItems =
    threadView && canUseThreads && !searchActive
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

  const listMessageIds = useMemo(
    () => listItems.map((m) => m.id),
    [listItems],
  );

  function toggleChecked(id: string, shiftKey = false) {
    if (shiftKey && checkboxAnchorRef.current && canBulkSelect) {
      const anchor = checkboxAnchorRef.current;
      const start = listMessageIds.indexOf(anchor);
      const end = listMessageIds.indexOf(id);
      if (start >= 0 && end >= 0) {
        const lo = Math.min(start, end);
        const hi = Math.max(start, end);
        setCheckedIds((prev) => {
          const next = new Set(prev);
          for (const mid of listMessageIds.slice(lo, hi + 1)) {
            next.add(mid);
          }
          return next;
        });
        checkboxAnchorRef.current = id;
        return;
      }
    }
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    checkboxAnchorRef.current = id;
  }

  const listNavigationEnabled =
    canBulkSelect &&
    listMessageIds.length > 0 &&
    !(threadView && canUseThreads && !searchActive);

  const navigateList = useCallback(
    (delta: 1 | -1) => {
      if (!listNavigationEnabled) {
        return;
      }
      const currentIndex = selectedId
        ? listMessageIds.indexOf(selectedId)
        : -1;
      let nextIndex =
        currentIndex < 0 ? (delta > 0 ? 0 : listMessageIds.length - 1) : currentIndex + delta;
      if (nextIndex < 0) {
        nextIndex = 0;
      }
      if (nextIndex >= listMessageIds.length) {
        nextIndex = listMessageIds.length - 1;
      }
      const nextId = listMessageIds[nextIndex];
      if (nextId) {
        void openMessage(nextId);
      }
    },
    [listNavigationEnabled, listMessageIds, selectedId],
  );

  const allListSelected =
    listMessageIds.length > 0 &&
    listMessageIds.every((id) => checkedIds.has(id));

  function toggleSelectAll() {
    if (allListSelected) {
      setCheckedIds(new Set());
      return;
    }
    setCheckedIds(new Set(listMessageIds));
  }

  function switchView(next: View) {
    setView(next);
    if (next !== "inbox") {
      setActiveCustomFolderId(null);
    }
    setDetail(null);
    setSentPreview(null);
    setSelectedId(null);
    setSearchQuery("");
    setSearchFrom("");
    setSearchDateFrom("");
    setSearchDateTo("");
    setSearchHasAttachment("any");
    setSearchFiltersOpen(false);
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
    const data = await fetchThreadMessages(
      accessToken,
      threadId,
      inboxFolder,
      inboxCustomFolderId,
    );
    setThreadMessages(data.messages);
    await openMessage(latestMessageId);
  }

  function resetCompose() {
    setEditingDraftId(null);
    setForwardMessageId(null);
    setComposeTo("");
    setComposeCc("");
    setComposeBcc("");
    setComposeShowCcBcc(false);
    setComposeSubject("");
    setComposeText("");
    setComposeRich(false);
    setComposeHtml("");
    setComposeFiles([]);
    setComposeStoredAttachments([]);
    setComposeError("");
  }

  function startForwardFromDetail() {
    if (!detail) {
      return;
    }
    resetCompose();
    setForwardMessageId(detail.id);
    const subj = detail.subject.trim();
    setComposeSubject(
      subj.toLowerCase().startsWith("fwd:") ? subj : `Fwd: ${subj}`,
    );
    setComposeOpen(true);
  }

  useMailKeyboardShortcuts({
    enabled: Boolean(accessToken) && !composeOpen,
    onCompose: () => {
      resetCompose();
      setComposeOpen(true);
    },
    onReply: () => {
      if (detail) {
        setReplyAllMode(false);
        document
          .querySelector<HTMLTextAreaElement>(".mail-reply textarea")
          ?.focus();
      }
    },
    onReplyAll: () => {
      if (detail) {
        setReplyAllMode(true);
        document
          .querySelector<HTMLTextAreaElement>(".mail-reply textarea")
          ?.focus();
      }
    },
    onSnooze1h: () => {
      if (detail && selectedId) {
        void snoozeSelected(1);
      }
    },
    onFocusSearch: () => searchInputRef.current?.focus(),
    onArchive: () => {
      if (detail) {
        void moveCurrentMessage("archive");
      }
    },
    onTrash: () => {
      if (detail) {
        void moveCurrentMessage("trash");
      }
    },
    onMarkUnread: () => {
      void markCurrentUnread();
    },
    onForward: () => {
      startForwardFromDetail();
    },
    onToggleStar: () => {
      toggleCurrentStarred();
    },
    listNavigationEnabled,
    onListNext: () => navigateList(1),
    onListPrev: () => navigateList(-1),
    onShowHelp: () => setShortcutsOpen(true),
    onEscape: () => {
      if (shortcutsOpen) {
        setShortcutsOpen(false);
      } else if (composeOpen) {
        setComposeOpen(false);
        resetCompose();
      }
    },
  });

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
          {inboxBranding?.allowed && inboxBranding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={inboxBranding.logoUrl}
              alt=""
              className="mail-brand-logo"
            />
          ) : null}
          {inboxBranding?.allowed && inboxBranding.emailBrandTitle ? (
            <span className="mail-brand-title-only">
              {inboxBranding.emailBrandTitle}
            </span>
          ) : (
            <>
              <strong>Lerta</strong> Posta
            </>
          )}
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
        <div className="mail-nav-scroll">
        <nav className="mail-nav">
          <button
            type="button"
            className={
              view === "inbox" && !activeCustomFolderId ? "active" : ""
            }
            onClick={() => {
              setActiveCustomFolderId(null);
              switchView("inbox");
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
            className={view === "starred" ? "active" : ""}
            onClick={() => switchView("starred")}
          >
            Yıldızlı
            {summary && (summary.starredCount ?? 0) > 0
              ? ` (${summary.starredCount})`
              : ""}
          </button>
          <button
            type="button"
            className={view === "snoozed" ? "active" : ""}
            onClick={() => switchView("snoozed")}
          >
            Ertelenen
            {summary && (summary.snoozedCount ?? 0) > 0
              ? ` (${summary.snoozedCount})`
              : ""}
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
          <button
            type="button"
            className={view === "calendar" ? "active" : ""}
            onClick={() => switchView("calendar")}
          >
            Takvim
          </button>
          <button
            type="button"
            className={view === "contacts" ? "active" : ""}
            onClick={() => switchView("contacts")}
          >
            Kişiler
          </button>
          <div className="mail-custom-folders-head">
            <span>Özel klasörler</span>
            <button
              type="button"
              className="mail-custom-folder-add"
              title="Yeni klasör"
              onClick={() => {
                const name = window.prompt("Klasör adı");
                if (!name?.trim() || !accessToken) {
                  return;
                }
                void (async () => {
                  try {
                    await createCustomFolder(accessToken, name.trim());
                    setToast("Klasör oluşturuldu.");
                    void refreshCustomFolders();
                  } catch (error) {
                    setToast(
                      error instanceof Error
                        ? error.message
                        : "Klasör oluşturulamadı.",
                    );
                  }
                })();
              }}
            >
              +
            </button>
          </div>
          {customFolders.map((f) => (
            <div key={f.id} className="mail-custom-folder-row">
              <button
                type="button"
                className={
                  view === "inbox" && activeCustomFolderId === f.id
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setActiveCustomFolderId(f.id);
                  switchView("inbox");
                  void refresh();
                }}
              >
                {f.name}
                {f.messageCount > 0 ? ` (${f.messageCount})` : ""}
              </button>
              <button
                type="button"
                className="mail-custom-folder-action"
                title="Yeniden adlandır"
                onClick={() => {
                  const next = window.prompt("Yeni klasör adı", f.name);
                  if (!next?.trim() || !accessToken || next.trim() === f.name) {
                    return;
                  }
                  void renameCustomFolder(accessToken, f.id, next.trim()).then(
                    () => {
                      setToast("Klasör güncellendi.");
                      void refreshCustomFolders();
                    },
                    (error: unknown) => {
                      setToast(
                        error instanceof Error
                          ? error.message
                          : "Klasör güncellenemedi.",
                      );
                    },
                  );
                }}
              >
                ✎
              </button>
              <button
                type="button"
                className="mail-custom-folder-action mail-custom-folder-delete"
                title="Klasörü sil"
                onClick={() => {
                  if (
                    !accessToken ||
                    !window.confirm(
                      `"${f.name}" silinsin mi? İçindeki postalar Gelen'e döner.`,
                    )
                  ) {
                    return;
                  }
                  void deleteCustomFolder(accessToken, f.id).then(
                    () => {
                      if (activeCustomFolderId === f.id) {
                        setActiveCustomFolderId(null);
                      }
                      setToast("Klasör silindi.");
                      void refreshCustomFolders();
                      void refresh();
                    },
                    (error: unknown) => {
                      setToast(
                        error instanceof Error
                          ? error.message
                          : "Klasör silinemedi.",
                      );
                    },
                  );
                }}
              >
                ×
              </button>
            </div>
          ))}
        </nav>
        </div>
        <div className="mail-sidebar-footer">
        <button
          type="button"
          className="mail-nav-imap"
          onClick={() => setSettingsOpen(true)}
        >
          Ayarlar (IMAP · imza · 2FA)
        </button>
        {summary?.storageQuota ? (
          <div className="mail-storage-quota">
            <div className="mail-storage-label">
              Depolama{" "}
              {(summary.storageQuota.usedBytes / (1024 ** 3)).toFixed(1)} /{" "}
              {summary.storageQuota.limitLabelGb} GB
            </div>
            <div className="mail-storage-bar">
              <div
                className={
                  summary.storageQuota.atLimit
                    ? "fill danger"
                    : summary.storageQuota.nearLimit
                      ? "fill warn"
                      : "fill"
                }
                style={{
                  width: `${summary.storageQuota.utilizationPercent}%`,
                }}
              />
            </div>
            {summary.storageQuota.nearLimit ? (
              <p className="mail-storage-warn">
                Depolama kotasına yaklaşıyorsunuz. Eski postaları arşivleyin veya
                silin.
              </p>
            ) : null}
          </div>
        ) : null}
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
          {process.env.NEXT_PUBLIC_DEPLOY_SHA ? (
            <span
              className="mail-deploy-sha"
              title={process.env.NEXT_PUBLIC_DEPLOY_TIME}
            >
              Sürüm {process.env.NEXT_PUBLIC_DEPLOY_SHA}
            </span>
          ) : null}
        </div>
        </div>
      </aside>

      {view === "calendar" || view === "contacts" ? (
        <section className="mail-d6-pane">
          {view === "calendar" ? (
            <MailCalendarPanel
              accessToken={accessToken!}
              onToast={setToast}
            />
          ) : (
            <MailContactsPanel
              accessToken={accessToken!}
              onToast={setToast}
              onComposeTo={(addr) => {
                resetCompose();
                setComposeTo(addr);
                setComposeOpen(true);
              }}
            />
          )}
        </section>
      ) : (
        <>
      <section
        className={`mail-list${isPrimaryInbox ? " mail-list-inbox-premium" : ""}`}
      >
        {view !== "drafts" ? (
          <div
            className={`mail-search${isPrimaryInbox ? " mail-inbox-search-premium" : ""}`}
          >
            {isPrimaryInbox ? (
              <header className="mail-inbox-header">
                <div className="mail-inbox-header-text">
                  <h2 className="mail-inbox-header-title">Gelen kutusu</h2>
                  <p className="mail-inbox-header-meta">
                    {summary && summary.unreadCount > 0
                      ? `${summary.unreadCount} okunmamış`
                      : "Tüm mesajlar okundu"}
                  </p>
                </div>
              </header>
            ) : null}
            <div className="mail-list-toolbar mail-list-toolbar-main">
              {canUseThreads && !searchActive ? (
                <label className="mail-thread-toggle">
                  <input
                    type="checkbox"
                    checked={threadView}
                    onChange={(e) => setThreadView(e.target.checked)}
                  />
                  Konuşma
                </label>
              ) : null}
              {canBulkSelect && listItems.length > 0 ? (
                <label className="mail-bulk-check">
                  <input
                    type="checkbox"
                    checked={allListSelected}
                    onChange={toggleSelectAll}
                    aria-label="Tümünü seç"
                  />
                </label>
              ) : null}
              {canBulkSelect && checkedIds.size > 0 ? (
                <span className="mail-bulk-actions">
                  <button type="button" onClick={() => void runBulkMarkRead(false)}>
                    Okundu
                  </button>
                  <button type="button" onClick={() => void runBulkMarkRead(true)}>
                    Okunmadı
                  </button>
                  <button type="button" onClick={() => void runBulkFolder("archive")}>
                    Arşiv
                  </button>
                  <button type="button" onClick={() => void runBulkFolder("trash")}>
                    Çöp
                  </button>
                  {view !== "trash" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void runBulkStar(true)}
                      >
                        Yıldızla
                      </button>
                      <button
                        type="button"
                        onClick={() => void runBulkStar(false)}
                      >
                        Yıldız kaldır
                      </button>
                      <select
                        className="mail-bulk-folder-select"
                        defaultValue=""
                        aria-label="Seçilenleri ertele"
                        onChange={(e) => {
                          const v = e.target.value;
                          e.target.value = "";
                          if (!v) {
                            return;
                          }
                          void runBulkSnooze(Number(v));
                        }}
                      >
                        <option value="">Ertele…</option>
                        <option value="1">1 saat</option>
                        <option value="3">3 saat</option>
                        <option value="24">1 gün</option>
                        <option value="168">1 hafta</option>
                      </select>
                    </>
                  ) : null}
                  {view === "inbox" || activeCustomFolderId ? (
                    <select
                      className="mail-bulk-folder-select"
                      defaultValue=""
                      aria-label="Özel klasöre taşı"
                      onChange={(e) => {
                        const v = e.target.value;
                        e.target.value = "";
                        if (!v) {
                          return;
                        }
                        void runBulkCustomFolder(
                          v === "__inbox__" ? null : v,
                        );
                      }}
                    >
                      <option value="">Klasöre taşı…</option>
                      <option value="__inbox__">Gelen (klasörsüz)</option>
                      {customFolders.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  ) : null}
                </span>
              ) : null}
              <button type="button" className="mail-toolbar-btn" onClick={() => void refresh()}>
                Yenile
              </button>
              <button
                type="button"
                className="mail-toolbar-btn"
                onClick={() => setShortcutsOpen(true)}
                title="Klavye kısayolları"
              >
                ?
              </button>
            </div>
            <div className="mail-inbox-search-field">
              <span className="mail-inbox-search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                ref={searchInputRef}
                type="search"
                placeholder={
                  isPrimaryInbox
                    ? "Gelen kutusunda ara…"
                    : "Ara (konu, gönderen)…"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Posta ara"
              />
            </div>
            <button
              type="button"
              className="mail-search-filters-toggle"
              onClick={() => setSearchFiltersOpen((open) => !open)}
            >
              {searchFiltersOpen ? "Filtreleri gizle" : "Gelişmiş filtre"}
            </button>
            {searchFiltersOpen ? (
              <div className="mail-search-filters">
                <label>
                  Gönderen
                  <input
                    type="text"
                    placeholder="ornek@firma.com"
                    value={searchFrom}
                    onChange={(e) => setSearchFrom(e.target.value)}
                  />
                </label>
                <label>
                  Başlangıç
                  <input
                    type="date"
                    value={searchDateFrom}
                    onChange={(e) => setSearchDateFrom(e.target.value)}
                  />
                </label>
                <label>
                  Bitiş
                  <input
                    type="date"
                    value={searchDateTo}
                    onChange={(e) => setSearchDateTo(e.target.value)}
                  />
                </label>
                <label>
                  Ek
                  <select
                    value={searchHasAttachment}
                    onChange={(e) =>
                      setSearchHasAttachment(
                        e.target.value as "any" | "yes" | "no",
                      )
                    }
                  >
                    <option value="any">Fark etmez</option>
                    <option value="yes">Ek var</option>
                    <option value="no">Ek yok</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="mail-search-clear"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchFrom("");
                    setSearchDateFrom("");
                    setSearchDateTo("");
                    setSearchHasAttachment("any");
                  }}
                >
                  Filtreleri temizle
                </button>
              </div>
            ) : null}
            {searchActive && searchResults !== null ? (
              <p className="mail-search-hint">
                {searchResults.length} sonuç
              </p>
            ) : null}
          </div>
        ) : null}
        {listItems.length === 0 ? (
          <MailEmptyState
            premium={isPrimaryInbox}
            variant={
              searchActive
                ? "search"
                : view === "sent"
                  ? "sent"
                  : view === "drafts"
                    ? "drafts"
                    : view === "starred"
                      ? "starred"
                      : "inbox"
            }
          />
        ) : (
          listItems.map((m) => {
            const unread =
              !m.readAt &&
              (view === "inbox" ||
                view === "all" ||
                view === "spam" ||
                view === "archive" ||
                view === "starred");

            if (isPrimaryInbox) {
              const openRow = () => {
                if (threadView && canUseThreads && "threadId" in m) {
                  void openThread(
                    (m as { threadId: string }).threadId,
                    m.id,
                  );
                  return;
                }
                void openMessage(m.id);
              };
              return (
                <MailInboxMessageRow
                  key={m.id}
                  message={{
                    ...m,
                    starredAt:
                      "starredAt" in m ? m.starredAt ?? null : null,
                  }}
                  selected={selectedId === m.id}
                  unread={unread}
                  showStar={
                    !threadView || !canUseThreads || searchActive
                  }
                  showCheckbox={canBulkSelect}
                  checked={checkedIds.has(m.id)}
                  onOpen={openRow}
                  onToggleStar={() => {
                    const starred =
                      "starredAt" in m && Boolean(m.starredAt);
                    void toggleMessageStarred(m.id, !starred);
                  }}
                  onToggleCheck={(shiftKey) =>
                    toggleChecked(m.id, shiftKey)
                  }
                />
              );
            }

            return (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              className={`mail-list-item ${selectedId === m.id ? "selected" : ""} ${unread ? "unread" : ""}`}
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
              {canBulkSelect ? (
                <input
                  type="checkbox"
                  className="mail-list-check"
                  checked={checkedIds.has(m.id)}
                  aria-label="Mesajı seç"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChecked(m.id, e.shiftKey);
                  }}
                  onChange={() => {}}
                />
              ) : null}
              {view !== "sent" &&
              view !== "drafts" &&
              (!threadView || !canUseThreads || searchActive) ? (
                <button
                  type="button"
                  className={`mail-star-btn ${
                    "starredAt" in m && m.starredAt ? "starred" : ""
                  }`}
                  aria-label={
                    "starredAt" in m && m.starredAt
                      ? "Yıldızı kaldır"
                      : "Yıldızla"
                  }
                  title={
                    "starredAt" in m && m.starredAt
                      ? "Yıldızı kaldır"
                      : "Yıldızla"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    const starred = "starredAt" in m && Boolean(m.starredAt);
                    void toggleMessageStarred(m.id, !starred);
                  }}
                >
                  {"starredAt" in m && m.starredAt ? "★" : "☆"}
                </button>
              ) : null}
              <div className="mail-list-item-body">
                <div className="mail-list-from">
                  {m.fromAddress}
                  {(m.attachmentCount ?? 0) > 0 ? " 📎" : ""}
                </div>
                <div className="mail-list-subject">{m.subject}</div>
                <div className="mail-list-snippet">{m.snippet}</div>
              </div>
            </div>
            );
          })
        )}
      </section>

      <section className="mail-read mail-read--premium">
        {pendingUndo ? (
          <div className="mail-undo-bar">
            <span>
              Gönderiliyor… {undoSecondsLeft > 0 ? `${undoSecondsLeft}s` : ""}
            </span>
            <button type="button" onClick={() => void cancelPendingUndo()}>
              Geri al
            </button>
          </div>
        ) : null}
        {toast && !pendingUndo ? (
          <p className="mail-read-toast">{toast}</p>
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
            <div className="mail-reply mail-reply--premium mail-reply-draft-actions">
              <button
                type="button"
                className="compose-btn compose-btn--secondary"
                onClick={() => openComposeFromDraft(draftPreview)}
              >
                Düzenle
              </button>
              <button
                type="button"
                className="compose-btn compose-btn--primary"
                onClick={() => {
                  if (!accessToken) {
                    return;
                  }
                  void (async () => {
                    try {
                      const draftResult = await sendDraft(
                        accessToken,
                        draftPreview.id,
                        { delaySeconds: 5 },
                      );
                      if (applyDelayedSend(draftResult)) {
                        setDraftPreview(null);
                        setSelectedId(null);
                        return;
                      }
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
                className="compose-btn compose-btn--ghost"
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
          <MailEmptyState variant="read" />
        ) : (
          <>
            <header className="mail-read-header mail-read-header--premium">
              <button
                type="button"
                className="mail-back-read compose-chip-btn"
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
              <h1 className="mail-read-title">{detail.subject}</h1>
              <div className="mail-read-meta mail-read-meta--premium">
                Kimden: {detail.fromAddress} ·{" "}
                {new Date(detail.receivedAt).toLocaleString("tr-TR")}
                {detail.spamReason ? ` · ${detail.spamReason}` : ""}
                {detail.snoozedUntil &&
                new Date(detail.snoozedUntil).getTime() > Date.now()
                  ? ` · Ertelenmiş: ${new Date(detail.snoozedUntil).toLocaleString("tr-TR")}`
                  : null}
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
            <div
              className="mail-read-toolbar"
              role="toolbar"
              aria-label="Mesaj işlemleri"
            >
              {detail.mailboxFolder !== "trash" ? (
                <button
                  type="button"
                  className={`mail-read-tool-btn ${detail.starredAt ? "is-active" : ""}`}
                  onClick={() => void toggleCurrentStarred()}
                >
                  {detail.starredAt ? "★ Yıldızlı" : "☆ Yıldızla"}
                </button>
              ) : null}
              {view === "trash" || detail.mailboxFolder === "trash" ? (
                <>
                  <button
                    type="button"
                    className="mail-read-tool-btn"
                    onClick={() => void moveCurrentMessage("inbox")}
                  >
                    Geri al
                  </button>
                  <button
                    type="button"
                    className="mail-read-tool-btn mail-read-tool-btn--danger"
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
                      className="mail-read-tool-btn"
                      onClick={() => void moveCurrentMessage("archive")}
                    >
                      Arşivle
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mail-read-tool-btn"
                      onClick={() => void moveCurrentMessage("inbox")}
                    >
                      Gelen kutusuna taşı
                    </button>
                  )}
                  <button
                    type="button"
                    className="mail-read-tool-btn"
                    onClick={() => void moveCurrentMessage("trash")}
                  >
                    Sil
                  </button>
                  {detail.readAt ? (
                    <button
                      type="button"
                      className="mail-read-tool-btn"
                      onClick={() => void markCurrentUnread()}
                    >
                      Okunmadı
                    </button>
                  ) : null}
                </>
              )}
            </div>
            {view !== "sent" && view !== "trash" ? (
              <div className="mail-reply mail-reply--premium">
                <div className="mail-reply-premium-head">
                  <h3 className="mail-reply-premium-title">Yanıt</h3>
                  {replyAllMode ? (
                    <span className="mail-reply-all-badge">Tümüne yanıt (a)</span>
                  ) : null}
                </div>
                <div className="compose-field mail-reply-field">
                  <label className="compose-field-label" htmlFor="reply-bcc">
                    Bcc
                  </label>
                  <input
                    id="reply-bcc"
                    type="text"
                    placeholder="Gizli kopya, virgülle ayırın"
                    value={replyBcc}
                    onChange={(e) => setReplyBcc(e.target.value)}
                    className="compose-input"
                  />
                </div>
                <textarea
                  className="compose-textarea mail-reply-textarea"
                  placeholder="Yanıtınızı yazın…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={5}
                />
                <div className="compose-attach-zone mail-reply-attach">
                  <label className="compose-attach-label">
                    <span className="compose-attach-title">Ek</span>
                    <span className="compose-attach-btn">Dosya seç</span>
                    <input
                      type="file"
                      multiple
                      className="compose-attach-input"
                      onChange={(e) =>
                        setReplyFiles(Array.from(e.target.files ?? []))
                      }
                    />
                  </label>
                  {replyFiles.length > 0 ? (
                    <p className="mail-attach-hint">
                      {replyFiles.length} ek (en fazla 3, {maxAttachmentMb} MB)
                    </p>
                  ) : (
                    <p className="compose-attach-hint">Dosya seçilmedi</p>
                  )}
                </div>
                {detail.snoozedUntil &&
                new Date(detail.snoozedUntil).getTime() > Date.now() &&
                accessToken &&
                selectedId ? (
                  <button
                    type="button"
                    className="compose-chip-btn mail-reply-unsnooze"
                    onClick={() =>
                      void unsnoozeMailMessage(accessToken, selectedId).then(
                        () => {
                          setToast("Erteleme kaldırıldı.");
                          void refresh();
                          void openMessage(selectedId);
                        },
                      )
                    }
                  >
                    Ertelemeyi kaldır
                  </button>
                ) : null}
                <div className="mail-reply-premium-actions">
                  <div className="mail-reply-action-group">
                    <button
                      type="button"
                      className="compose-btn compose-btn--primary"
                      onClick={() => void sendReply(false)}
                    >
                      Yanıtla
                    </button>
                    <button
                      type="button"
                      className="compose-btn compose-btn--secondary"
                      onClick={() => void sendReply(true)}
                    >
                      Tümüne yanıtla
                    </button>
                  </div>
                  <div className="mail-reply-action-group mail-reply-action-group--end">
                    <select
                      className="compose-select mail-snooze-select"
                      defaultValue=""
                      aria-label="Ertele"
                      onChange={(e) => {
                        const hours = Number(e.target.value);
                        if (hours > 0) {
                          void snoozeSelected(hours);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">Ertele…</option>
                      <option value="1">1 saat</option>
                      <option value="3">3 saat</option>
                      <option value="24">Yarın</option>
                      <option value="168">1 hafta</option>
                    </select>
                    <button
                      type="button"
                      className="compose-btn compose-btn--ghost"
                      onClick={() => startForwardFromDetail()}
                    >
                      İlet
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
        </>
      )}

      {composeOpen ? (
        <div
          className="compose-overlay compose-overlay--premium"
          role="presentation"
          onClick={() => {
            setComposeOpen(false);
            resetCompose();
          }}
        >
          <div
            className="compose-dialog compose-dialog--premium"
            role="dialog"
            aria-labelledby="compose-premium-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="compose-premium-header">
              <div className="compose-premium-header-text">
                <h2 id="compose-premium-title">
                  {forwardMessageId
                    ? "İlet"
                    : editingDraftId
                      ? "Taslak düzenle"
                      : "Yeni mesaj"}
                </h2>
                <p className="compose-premium-subtitle">
                  {summary?.primaryAddress
                    ? `Gönderen: ${summary.primaryAddress}`
                    : "Kurumsal gönderim"}
                </p>
              </div>
              <button
                type="button"
                className="compose-premium-close"
                aria-label="Kapat"
                onClick={() => {
                  setComposeOpen(false);
                  resetCompose();
                }}
              >
                ×
              </button>
            </header>

            <div className="compose-premium-body">
              <div className="compose-field">
                <label className="compose-field-label" htmlFor="compose-to">
                  Kime
                </label>
                <input
                  id="compose-to"
                  className="compose-input"
                  placeholder="ornek@firma.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  autoFocus
                />
              </div>

              {!forwardMessageId ? (
                <div className="compose-premium-inline-tools">
                  <button
                    type="button"
                    className="compose-chip-btn"
                    onClick={() => setComposeShowCcBcc((open) => !open)}
                  >
                    {composeShowCcBcc ? "Cc/Bcc gizle" : "Cc / Bcc"}
                  </button>
                </div>
              ) : null}

              {!forwardMessageId && composeShowCcBcc ? (
                <>
                  <div className="compose-field">
                    <label className="compose-field-label" htmlFor="compose-cc">
                      Cc
                    </label>
                    <input
                      id="compose-cc"
                      className="compose-input"
                      placeholder="Virgülle ayırın"
                      value={composeCc}
                      onChange={(e) => setComposeCc(e.target.value)}
                    />
                  </div>
                  <div className="compose-field">
                    <label className="compose-field-label" htmlFor="compose-bcc">
                      Bcc
                    </label>
                    <input
                      id="compose-bcc"
                      className="compose-input"
                      placeholder="Virgülle ayırın"
                      value={composeBcc}
                      onChange={(e) => setComposeBcc(e.target.value)}
                    />
                  </div>
                </>
              ) : null}

              {forwardMessageId ? (
                <p className="mail-compose-forward-hint compose-premium-forward">
                  Konu: <strong>{composeSubject}</strong> — orijinal metin
                  otomatik eklenir.
                </p>
              ) : (
                <div className="compose-field">
                  <label className="compose-field-label" htmlFor="compose-subject">
                    Konu
                  </label>
                  <input
                    id="compose-subject"
                    className="compose-input"
                    placeholder="Mesaj konusu"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                  />
                </div>
              )}

              <div className="compose-preset-row compose-premium-presets">
                <label className="compose-preset-label">
                  <span>Şablon</span>
                  <select
                    className="compose-select"
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
                <label className="compose-preset-label">
                  <span>İmza</span>
                  <select
                    className="compose-select"
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

              <div className="compose-premium-editor-wrap">
                {!forwardMessageId && !editingDraftId ? (
                  <ComposeRichEditor
                    enabled={composeRich}
                    onEnabledChange={setComposeRich}
                    plainText={composeText}
                    onPlainTextChange={setComposeText}
                    onHtmlChange={setComposeHtml}
                  />
                ) : null}
                {!composeRich || forwardMessageId || editingDraftId ? (
                  <textarea
                    className="compose-textarea"
                    placeholder={
                      forwardMessageId
                        ? "Üst not (isteğe bağlı)…"
                        : "Mesajınızı yazın…"
                    }
                    rows={8}
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                  />
                ) : null}
              </div>

              <div className="compose-attach-zone">
                <label className="compose-attach-label">
                  <span className="compose-attach-title">Ekler</span>
                  <span className="compose-attach-btn">Dosya seç</span>
                  <input
                    type="file"
                    multiple
                    className="compose-attach-input"
                    onChange={(e) =>
                      setComposeFiles(Array.from(e.target.files ?? []))
                    }
                  />
                </label>
                {composeStoredAttachments.length > 0 ? (
                  <ul className="compose-attach-list">
                    {composeStoredAttachments.map((file) => (
                      <li key={file.filename}>{file.filename} (taslakta)</li>
                    ))}
                  </ul>
                ) : null}
                {composeFiles.length > 0 ? (
                  <p className="mail-attach-hint">
                    {composeFiles.length} yeni ek (en fazla {maxAttachmentMb}{" "}
                    MB)
                  </p>
                ) : (
                  <p className="compose-attach-hint">Dosya seçilmedi</p>
                )}
              </div>

              {composeError ? (
                <p className="compose-premium-error">{composeError}</p>
              ) : null}
            </div>

            <footer className="compose-premium-footer">
              <div className="compose-actions compose-actions--premium">
                <button
                  type="button"
                  className="compose-btn compose-btn--ghost"
                  onClick={() => {
                    setComposeOpen(false);
                    resetCompose();
                  }}
                >
                  İptal
                </button>
                {!forwardMessageId ? (
                  <button
                    type="button"
                    className="compose-btn compose-btn--secondary"
                    disabled={sending}
                    onClick={() => void saveComposeDraft()}
                  >
                    Taslak kaydet
                  </button>
                ) : null}
                <button
                  type="button"
                  className="compose-btn compose-btn--primary"
                  disabled={sending}
                  onClick={() => void sendCompose()}
                >
                  {sending ? "Gönderiliyor…" : "Gönder"}
                </button>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
      {settingsOpen && accessToken ? (
        <MailSettingsPanel
          accessToken={accessToken}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
      {shortcutsOpen ? (
        <MailShortcutsDialog onClose={() => setShortcutsOpen(false)} />
      ) : null}
    </div>
  );
}
