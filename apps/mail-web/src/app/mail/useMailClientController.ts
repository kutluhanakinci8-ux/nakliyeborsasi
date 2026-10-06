"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatMailListDate } from "@/lib/mailDisplay";
import {
  builtinComposeTemplatesFallback,
  mergeComposeTemplatesWithBuiltins,
} from "@/lib/mailComposePresets";
import { syncMailUnreadBadge } from "@/lib/mailUnreadBadge";
import {
  fetchInboxWithOfflineCache,
  fetchMessageWithOfflineCache,
} from "@/lib/mailOfflineCache";
import {
  cancelDelayedCompose,
  fetchDelayedComposeStatus,
  composeMail,
  createDraft,
  deleteDraft,
  deleteSentMessage,
  trashSentMessage,
  restoreSentFromTrash,
  downloadMailAttachment,
  fetchComposePresets,
  fetchDrafts,
  fetchInboxPreferences,
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
  fetchSuggestReply,
  fetchAiMailConsent,
  patchAiMailConsent,
  fetchSummarizeMessage,
  fetchClassifyMessage,
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
  type MailSendReadiness,
  type MailCustomFolder,
  type MailInboxThreadRow,
  type MailSentItem,
  type MailSentMessageDetail,
  type ComposeAttachment,
  type MailInboxListDensity,
} from "@/lib/mailApi";
import { useMailKeyboardShortcuts } from "./useMailKeyboardShortcuts";

import {
  inboxFolderForView,
  parseMailClientViewParam,
  type MailClientView,
} from "./mailClientHelpers";

import type { ReadonlyURLSearchParams } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export type MailClientController = ReturnType<typeof useMailClientController>;

type Params = {
  accessToken: string | null;
  logout: () => void;
  router: AppRouterInstance;
  searchParams: ReadonlyURLSearchParams;
  embedMode: boolean;
};

export function useMailClientController({
  accessToken,
  logout,
  router,
  searchParams,
  embedMode,
}: Params) {
  const deepLinkMessageHandled = useRef(false);
  const deepLinkComposeHandled = useRef(false);
  const deepLinkViewHandled = useRef(false);
  const deepLinkCustomFolderHandled = useRef(false);
  const deepLinkOpenComposeHandled = useRef(false);
  const deepLinkComposeRichHandled = useRef(false);
  const deepLinkComposeMultipartHandled = useRef(false);
  const deepLinkComposeTemplateHandled = useRef(false);
  const deepLinkMailSettingsHandled = useRef(false);
  const deepLinkMailBulkHandled = useRef(false);
  const deepLinkMailSwipeHandled = useRef(false);
  const deepLinkMailDmarcHandled = useRef(false);
  const deepLinkMailPwaHandled = useRef(false);
  const deepLinkComposeAiHandled = useRef(false);
  const deepLinkMailEngagementHandled = useRef(false);
  const deepLinkMailOpsHandled = useRef(false);
  const [mailBulkAssistActive, setMailBulkAssistActive] = useState(false);
  const [mailSwipeAssistActive, setMailSwipeAssistActive] = useState(false);
  const [mailDmarcAssistActive, setMailDmarcAssistActive] = useState(false);
  const [mailPwaAssistActive, setMailPwaAssistActive] = useState(false);
  const [composeAiAssistActive, setComposeAiAssistActive] = useState(false);
  const [composeAiDraftBusy, setComposeAiDraftBusy] = useState(false);
  const [mailEngagementAssistActive, setMailEngagementAssistActive] =
    useState(false);
  const [mailOpsAssistActive, setMailOpsAssistActive] = useState(false);
  const [view, setView] = useState<MailClientView>("inbox");
  const [summary, setSummary] = useState<MailInboxSummary | null>(null);
  const [sendReadiness, setSendReadiness] = useState<MailSendReadiness | null>(
    null,
  );
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
  const [aiSuggestBusy, setAiSuggestBusy] = useState(false);
  const [aiMailConsent, setAiMailConsent] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void fetchAiMailConsent(accessToken)
      .then((payload) => setAiMailConsent(payload.aiMailAssistConsent))
      .catch(() => undefined);
  }, [accessToken]);

  async function ensureAiMailConsent(): Promise<boolean> {
    if (aiMailConsent) {
      return true;
    }
    const ok = window.confirm(
      "AI posta asistanı metinlerinizi işler. KVKK kapsamında onay veriyor musunuz?",
    );
    if (!ok || !accessToken) {
      return false;
    }
    await patchAiMailConsent(accessToken, true);
    setAiMailConsent(true);
    return true;
  }
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
  const [settingsInitialView, setSettingsInitialView] = useState<
    import("./MailSettingsPanel").SettingsView | null
  >(null);
  const [inboxListDensity, setInboxListDensity] =
    useState<MailInboxListDensity>("comfortable");
  const [activeSwipeRowId, setActiveSwipeRowId] = useState<string | null>(null);
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
  const [composeRich, setComposeRich] = useState(true);
  const [composeHtml, setComposeHtml] = useState("");
  const [inboxOffline, setInboxOffline] = useState(false);
  const [inboxOfflineCachedAt, setInboxOfflineCachedAt] = useState<
    number | null
  >(null);
  const [detailOffline, setDetailOffline] = useState(false);
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
      const data = await fetchInboxWithOfflineCache(accessToken, "inbox");
      setSummary(data.summary);
      setSendReadiness(data.sendReadiness ?? null);
      setInboxOffline(data.fromOfflineCache);
      setInboxOfflineCachedAt(data.cachedAt);
      return;
    }
    const folder = inboxFolderForView(view);
    const data = await fetchInboxWithOfflineCache(
      accessToken,
      folder,
      folder === "inbox" ? inboxCustomFolderId : undefined,
    );
    setSummary(data.summary);
    setSendReadiness(data.sendReadiness ?? null);
    setMessages(data.messages);
    setSent(data.sent);
    setInboxOffline(data.fromOfflineCache);
    setInboxOfflineCachedAt(data.cachedAt);
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
    void fetchInboxPreferences(accessToken)
      .then((data) =>
        setInboxListDensity(data.preferences.inboxListDensity ?? "comfortable"),
      )
      .catch(() => undefined);
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
    if (sendReadiness && !sendReadiness.canSend && sendReadiness.reasonTr) {
      setComposeError(sendReadiness.reasonTr);
    }
    void fetchComposePresets(accessToken)
      .then((data) => {
        setComposeSignatures(data.signatures);
        setComposeTemplates(
          mergeComposeTemplatesWithBuiltins(data.templates),
        );
      })
      .catch(() => {
        setComposeTemplates(builtinComposeTemplatesFallback());
      });
  }, [composeOpen, accessToken, sendReadiness]);

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

  function applyMessageReadLocal(messageId: string, readAt: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, readAt } : m)),
    );
    setSearchResults((prev) =>
      prev
        ? prev.map((m) => (m.id === messageId ? { ...m, readAt } : m))
        : prev,
    );
    setThreads((prev) =>
      prev.map((t) =>
        t.latestMessageId === messageId && t.unreadCount > 0
          ? { ...t, unreadCount: 0 }
          : t,
      ),
    );
    setSummary((prev) =>
      prev && prev.unreadCount > 0
        ? { ...prev, unreadCount: Math.max(0, prev.unreadCount - 1) }
        : prev,
    );
  }

  async function openMessage(id: string) {
    if (!accessToken) {
      return;
    }
    setMobilePane("read");
    setSelectedId(id);
    setSentPreview(null);
    const { message, fromOfflineCache } = await fetchMessageWithOfflineCache(
      accessToken,
      id,
    );
    setDetailOffline(fromOfflineCache);
    setReplyText("");
    setReplyFiles([]);
    if (!message.readAt) {
      const readAt = new Date().toISOString();
      setDetail({ ...message, readAt });
      applyMessageReadLocal(id, readAt);
      try {
        await markRead(accessToken, id);
      } finally {
        void refresh();
      }
      return;
    }
    setDetail(message);
  }

  useEffect(() => {
    const messageId = searchParams.get("message");
    if (!accessToken || !messageId || deepLinkMessageHandled.current) {
      return;
    }
    deepLinkMessageHandled.current = true;
    void openMessage(messageId);
  }, [accessToken, searchParams]);

  useEffect(() => {
    const to = searchParams.get("composeTo")?.trim();
    if (!accessToken || !to || deepLinkComposeHandled.current) {
      return;
    }
    deepLinkComposeHandled.current = true;
    setComposeTo(to);
    setComposeOpen(true);
  }, [accessToken, searchParams]);

  useEffect(() => {
    const parsed = parseMailClientViewParam(searchParams.get("mailView"));
    if (!accessToken || !parsed || deepLinkViewHandled.current) {
      return;
    }
    deepLinkViewHandled.current = true;
    setView(parsed);
    if (parsed !== "inbox") {
      setActiveCustomFolderId(null);
    }
    setDetail(null);
    setSentPreview(null);
    setSelectedId(null);
    setMobilePane("list");
  }, [accessToken, searchParams]);

  useEffect(() => {
    const raw = searchParams.get("compose")?.trim();
    if (!accessToken || raw !== "1" || deepLinkOpenComposeHandled.current) {
      return;
    }
    deepLinkOpenComposeHandled.current = true;
    setComposeOpen(true);
  }, [accessToken, searchParams]);

  useEffect(() => {
    const raw = searchParams.get("composeRich")?.trim();
    if (!accessToken || !raw || deepLinkComposeRichHandled.current) {
      return;
    }
    deepLinkComposeRichHandled.current = true;
    setComposeRich(raw !== "0");
    if (searchParams.get("compose") === "1") {
      setComposeOpen(true);
    }
  }, [accessToken, searchParams]);

  useEffect(() => {
    if (
      !accessToken ||
      searchParams.get("composeMultipart") !== "1" ||
      deepLinkComposeMultipartHandled.current
    ) {
      return;
    }
    deepLinkComposeMultipartHandled.current = true;
    setComposeOpen(true);
    setComposeShowCcBcc(true);
  }, [accessToken, searchParams]);

  useEffect(() => {
    const raw = searchParams.get("composeTemplate")?.trim();
    if (!accessToken || !raw || deepLinkComposeTemplateHandled.current) {
      return;
    }
    if (composeTemplates.length === 0) {
      return;
    }
    const normalized = raw.includes(":") ? raw : `builtin:${raw}`;
    const preset = composeTemplates.find(
      (t) => t.id === normalized || t.id === raw,
    );
    if (!preset) {
      return;
    }
    deepLinkComposeTemplateHandled.current = true;
    setComposeOpen(true);
    if (preset.subject) {
      setComposeSubject(preset.subject);
    }
    setComposeText(preset.bodyText);
  }, [accessToken, searchParams, composeTemplates]);

  useEffect(() => {
    const raw = searchParams.get("mailSettings")?.trim();
    if (!accessToken || !raw || deepLinkMailSettingsHandled.current) {
      return;
    }
    const allowed = new Set([
      "hub",
      "accounts",
      "deliverability",
      "imap",
      "signature",
      "rules",
      "security",
      "privacy",
      "notifications",
      "display",
      "mailPrefs",
      "autoReply",
      "calendarSettings",
      "contactsSettings",
      "help",
      "ops",
    ]);
    if (!allowed.has(raw)) {
      return;
    }
    deepLinkMailSettingsHandled.current = true;
    setSettingsInitialView(raw as import("./MailSettingsPanel").SettingsView);
    setSettingsOpen(true);
  }, [accessToken, searchParams]);

  useEffect(() => {
    if (
      !accessToken ||
      searchParams.get("mailBulk") !== "1" ||
      deepLinkMailBulkHandled.current
    ) {
      return;
    }
    deepLinkMailBulkHandled.current = true;
    setView("inbox");
    setActiveCustomFolderId(null);
    setMailBulkAssistActive(true);
  }, [accessToken, searchParams]);

  useEffect(() => {
    if (
      !accessToken ||
      searchParams.get("mailSwipe") !== "1" ||
      deepLinkMailSwipeHandled.current
    ) {
      return;
    }
    deepLinkMailSwipeHandled.current = true;
    setView("inbox");
    setActiveCustomFolderId(null);
    setMailSwipeAssistActive(true);
  }, [accessToken, searchParams]);

  useEffect(() => {
    if (
      !accessToken ||
      searchParams.get("mailDmarc") !== "1" ||
      deepLinkMailDmarcHandled.current
    ) {
      return;
    }
    deepLinkMailDmarcHandled.current = true;
    setMailDmarcAssistActive(true);
    setSettingsInitialView("deliverability");
    setSettingsOpen(true);
  }, [accessToken, searchParams]);

  useEffect(() => {
    if (
      !accessToken ||
      searchParams.get("mailPwa") !== "1" ||
      deepLinkMailPwaHandled.current
    ) {
      return;
    }
    deepLinkMailPwaHandled.current = true;
    setMailPwaAssistActive(true);
    setSettingsInitialView("notifications");
    setSettingsOpen(true);
  }, [accessToken, searchParams]);

  useEffect(() => {
    if (
      !accessToken ||
      searchParams.get("composeAi") !== "1" ||
      deepLinkComposeAiHandled.current
    ) {
      return;
    }
    deepLinkComposeAiHandled.current = true;
    setComposeAiAssistActive(true);
    setComposeRich(true);
    setComposeOpen(true);
  }, [accessToken, searchParams]);

  useEffect(() => {
    if (
      !accessToken ||
      searchParams.get("mailEngagement") !== "1" ||
      deepLinkMailEngagementHandled.current
    ) {
      return;
    }
    deepLinkMailEngagementHandled.current = true;
    setMailEngagementAssistActive(true);
    setSettingsInitialView("deliverability");
    setSettingsOpen(true);
  }, [accessToken, searchParams]);

  useEffect(() => {
    if (
      !accessToken ||
      searchParams.get("mailOps") !== "1" ||
      deepLinkMailOpsHandled.current
    ) {
      return;
    }
    deepLinkMailOpsHandled.current = true;
    setMailOpsAssistActive(true);
    setSettingsInitialView("ops");
    setSettingsOpen(true);
  }, [accessToken, searchParams]);

  useEffect(() => {
    const needle = searchParams.get("customFolder")?.trim();
    if (
      !accessToken ||
      !needle ||
      deepLinkCustomFolderHandled.current ||
      customFolders.length === 0
    ) {
      return;
    }
    const lower = needle.toLowerCase();
    const match = customFolders.find(
      (folder) =>
        folder.id === needle ||
        folder.name.trim().toLowerCase() === lower ||
        folder.name.trim().toLowerCase().includes(lower),
    );
    if (!match) {
      return;
    }
    deepLinkCustomFolderHandled.current = true;
    setView("inbox");
    setActiveCustomFolderId(match.id);
    setDetail(null);
    setSentPreview(null);
    setSelectedId(null);
    setMobilePane("list");
  }, [accessToken, searchParams, customFolders]);

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

  async function promptCreateCustomFolder(): Promise<void> {
    const name = window.prompt("Klasör adı");
    if (!name?.trim() || !accessToken) {
      return;
    }
    try {
      await createCustomFolder(accessToken, name.trim());
      setToast("Klasör oluşturuldu.");
      void refreshCustomFolders();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Klasör oluşturulamadı.",
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

  function removeMessageFromLocalLists(messageId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setSearchResults((prev) =>
      prev ? prev.filter((m) => m.id !== messageId) : prev,
    );
    setSent((prev) => prev.filter((s) => s.id !== messageId));
    setThreads((prev) =>
      prev.filter((t) => t.latestMessageId !== messageId),
    );
  }

  function clearRowSelectionAfterSwipe(messageId: string) {
    if (selectedId === messageId) {
      setDetail(null);
      setSelectedId(null);
      setSentPreview(null);
      setDraftPreview(null);
      setMobilePane("list");
    }
    setCheckedIds((prev) => {
      if (!prev.has(messageId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
  }

  async function swipeRowArchive(
    messageId: string,
    relatedInboundMessageId?: string | null,
    messageKind: "inbound" | "sent" = view === "sent" ? "sent" : "inbound",
  ) {
    if (!accessToken) {
      return;
    }
    const kind = messageKind;
    try {
      if (view === "trash" && kind === "sent") {
        await restoreSentFromTrash(accessToken, messageId);
        setToast("Gönderilen klasörüne geri alındı.");
      } else if (view === "sent") {
        if (!relatedInboundMessageId) {
          setToast("Bu gönderim için arşivlenecek gelen mesaj yok.");
          return;
        }
        await setMessageMailboxFolder(
          accessToken,
          relatedInboundMessageId,
          "archive",
        );
        setToast("İlişkili mesaj arşivlendi.");
      } else if (view === "drafts") {
        setToast("Taslaklar arşivlenemez.");
        return;
      } else if (view === "trash") {
        await setMessageMailboxFolder(accessToken, messageId, "inbox");
        setToast("Gelen kutusuna alındı.");
      } else {
        const folder: MailMailboxFolder =
          view === "archive" ? "inbox" : "archive";
        await setMessageMailboxFolder(accessToken, messageId, folder);
        setToast(
          folder === "archive" ? "Arşivlendi." : "Gelen kutusuna alındı.",
        );
      }
      clearRowSelectionAfterSwipe(messageId);
      if (view !== "sent") {
        removeMessageFromLocalLists(messageId);
      }
      void refresh();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Arşivlenemedi.",
      );
    }
  }

  async function swipeRowDelete(
    messageId: string,
    messageKind: "inbound" | "sent" = view === "sent" ? "sent" : "inbound",
  ) {
    if (!accessToken) {
      return;
    }
    const kind = messageKind;
    try {
      if (kind === "sent" || view === "sent") {
        if (view === "trash") {
          await deleteSentMessage(accessToken, messageId);
          setToast("Kalıcı olarak silindi.");
        } else {
          await trashSentMessage(accessToken, messageId);
          setToast("Çöp kutusuna taşındı.");
        }
      } else if (view === "drafts") {
        await deleteDraft(accessToken, messageId);
        setToast("Taslak silindi.");
      } else if (view === "trash") {
        await deleteMessagePermanently(accessToken, messageId);
        setToast("Kalıcı olarak silindi.");
      } else {
        await setMessageMailboxFolder(accessToken, messageId, "trash");
        setToast("Çöp kutusuna taşındı.");
      }
      clearRowSelectionAfterSwipe(messageId);
      if (view !== "trash") {
        removeMessageFromLocalLists(messageId);
      }
      void refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Silinemedi.");
    }
  }

  const swipeArchiveLabel =
    view === "trash" ? "Geri al" : view === "archive" ? "Gelen kutusu" : "Arşivle";

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
          relatedInboundMessageId: s.relatedInboundMessageId ?? null,
          messageKind: "sent" as const,
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

  function switchView(next: MailClientView) {
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
    setComposeAiAssistActive(false);
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

  const storageAtLimit = summary?.storageQuota?.atLimit ?? false;

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
  return {
    accessToken,
    activeCustomFolderId,
    activeSwipeRowId,
    activeThreadId,
    aiMailConsent,
    aiSuggestBusy,
    allListSelected,
    applyComposeSignature,
    applyComposeTemplate,
    applyDelayedSend,
    applyMessageReadLocal,
    canBulkSelect,
    canUseThreads,
    cancelPendingUndo,
    checkboxAnchorRef,
    checkedIds,
    clearRowSelectionAfterSwipe,
    composeBcc,
    composeCc,
    composeError,
    composeFiles,
    composeHtml,
    composeOpen,
    composeRich,
    composeShowCcBcc,
    composeSignatures,
    composeStoredAttachments,
    composeSubject,
    composeTemplates,
    composeText,
    composeTo,
    customFolders,
    deepLinkComposeHandled,
    deepLinkMessageHandled,
    detail,
    detailOffline,
    downloadAttachment,
    draftPreview,
    drafts,
    editingDraftId,
    embedMode,
    ensureAiMailConsent,
    filteredSent,
    forwardMessageId,
    inboxBranding,
    inboxCustomFolderId,
    inboxFolder,
    inboxListDensity,
    inboxOffline,
    inboxOfflineCachedAt,
    isPrimaryInbox,
    listItems,
    listMessageIds,
    listNavigationEnabled,
    logout,
    markCurrentUnread,
    maxAttachmentMb,
    messages,
    mobilePane,
    moveCurrentMessage,
    navigateList,
    openComposeFromDraft,
    openMessage,
    openThread,
    pendingUndo,
    promptCreateCustomFolder,
    purgeCurrentMessage,
    refresh,
    refreshCustomFolders,
    refreshDrafts,
    removeMessageFromLocalLists,
    replyAllMode,
    replyBcc,
    replyFiles,
    replyText,
    resetCompose,
    router,
    runBulkCustomFolder,
    runBulkFolder,
    runBulkMarkRead,
    runBulkSnooze,
    runBulkStar,
    saveComposeDraft,
    searchActive,
    searchDateFrom,
    searchDateTo,
    searchFiltersOpen,
    searchFrom,
    searchHasAttachment,
    searchInputRef,
    searchParams,
    searchQuery,
    searchResults,
    selectedId,
    sendCompose,
    sendReadiness,
    sendReply,
    sending,
    sent,
    sentLoading,
    sentPreview,
    setActiveCustomFolderId,
    setActiveSwipeRowId,
    setActiveThreadId,
    setAiMailConsent,
    setAiSuggestBusy,
    setCheckedIds,
    setComposeBcc,
    setComposeCc,
    setComposeError,
    setComposeFiles,
    setComposeHtml,
    setComposeOpen,
    setComposeRich,
    setComposeShowCcBcc,
    setComposeSignatures,
    setComposeStoredAttachments,
    setComposeSubject,
    setComposeTemplates,
    setComposeText,
    setComposeTo,
    setCustomFolders,
    setDetail,
    setDetailOffline,
    setDraftPreview,
    setDrafts,
    setEditingDraftId,
    setForwardMessageId,
    setInboxBranding,
    setInboxListDensity,
    setInboxOffline,
    setInboxOfflineCachedAt,
    setMessages,
    setMobilePane,
    setPendingUndo,
    setReplyAllMode,
    setReplyBcc,
    setReplyFiles,
    setReplyText,
    setSearchDateFrom,
    setSearchDateTo,
    setSearchFiltersOpen,
    setSearchFrom,
    setSearchHasAttachment,
    setSearchQuery,
    setSearchResults,
    setSelectedId,
    setSendReadiness,
    setSending,
    setSent,
    setSentLoading,
    setSentPreview,
    setSettingsOpen,
    settingsInitialView,
    setSettingsInitialView,
    mailBulkAssistActive,
    setMailBulkAssistActive,
    mailSwipeAssistActive,
    setMailSwipeAssistActive,
    mailDmarcAssistActive,
    setMailDmarcAssistActive,
    mailPwaAssistActive,
    setMailPwaAssistActive,
    composeAiAssistActive,
    setComposeAiAssistActive,
    composeAiDraftBusy,
    setComposeAiDraftBusy,
    mailEngagementAssistActive,
    setMailEngagementAssistActive,
    mailOpsAssistActive,
    setMailOpsAssistActive,
    setShortcutsOpen,
    setSummary,
    setThreadMessages,
    setThreadView,
    setThreads,
    setToast,
    setUndoSecondsLeft,
    setView,
    settingsOpen,
    shortcutsOpen,
    snoozeSelected,
    startForwardFromDetail,
    storageAtLimit,
    summary,
    swipeArchiveLabel,
    swipeRowArchive,
    swipeRowDelete,
    switchView,
    threadMessages,
    threadView,
    threads,
    toast,
    toggleChecked,
    toggleCurrentStarred,
    toggleMessageStarred,
    toggleSelectAll,
    undoSecondsLeft,
    view,
  };
}
