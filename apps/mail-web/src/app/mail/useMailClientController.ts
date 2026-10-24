"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatMailListDate } from "@/lib/mailDisplay";
import {
  builtinComposeTemplatesFallback,
  mergeComposeTemplatesWithBuiltins,
} from "@/lib/mailComposePresets";
import { syncMailUnreadBadge } from "@/lib/mailUnreadBadge";
import {
  applyRemoteImagesPolicyToHtml,
  htmlHasBlockedRemoteImages,
} from "@/lib/mailHtmlBodyDisplay";
import {
  applyReadFontScaleToHtml,
  initReadFontScale,
  MAIL_READ_FONT_SCALE_CHANGE_EVENT,
  readReadFontScale,
  readThreadViewPreference,
  type MailReadFontScale,
  writeThreadViewPreference,
} from "@/lib/mailDisplayPrefs";
import {
  composeDelaySecondsFromUndoPref,
  pickMailPostaPreferences,
} from "@/lib/mailPostaPrefs";
import {
  fetchInboxWithOfflineCache,
  fetchMessageWithOfflineCache,
} from "@/lib/mailOfflineCache";
import {
  cancelDelayedCompose,
  fetchDelayedComposeStatus,
  composeMail,
  composeCampaign,
  previewCampaignSegment,
  type CampaignSegmentPreview,
  fetchComposeOutboundPreview,
  createDraft,
  deleteDraft,
  deleteSentMessage,
  trashSentMessage,
  restoreSentFromTrash,
  downloadMailAttachment,
  fetchComposePresets,
  fetchOrgContacts,
  isMailSessionExpiredError,
  type MailOrgContact,
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
  emptyMailTrash,
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
  type ComposeCampaignResult,
  type MailInboxListDensity,
} from "@/lib/mailApi";
import { useMailKeyboardShortcuts } from "./useMailKeyboardShortcuts";

import {
  inboxFolderForView,
  parseMailClientViewParam,
  type MailClientView,
} from "./mailClientHelpers";
import {
  MAX_CAMPAIGN_RECIPIENTS,
  mergeCampaignRecipientLists,
  parseCampaignCsvText,
  parseCampaignRecipientsText,
} from "@/lib/mailCampaignRecipients";

import type { ReadonlyURLSearchParams } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export type MailClientController = ReturnType<typeof useMailClientController>;

type Params = {
  accessToken: string | null;
  logout: () => void;
  router: AppRouterInstance;
  searchParams: ReadonlyURLSearchParams;
  embedMode: boolean;
  embedHubShell?: boolean;
  shellBrand?: string;
};

export function useMailClientController({
  accessToken,
  logout,
  router,
  searchParams,
  embedMode,
  embedHubShell = false,
  shellBrand = "",
}: Params) {
  const listMessageIdsRef = useRef<string[]>([]);
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
  const [composeOrgContacts, setComposeOrgContacts] = useState<
    MailOrgContact[]
  >([]);
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
  const [readFontScale, setReadFontScale] =
    useState<MailReadFontScale>("default");
  const [activeSwipeRowId, setActiveSwipeRowId] = useState<string | null>(null);
  const [threadView, setThreadViewState] = useState(false);
  const [mailPostaPrefs, setMailPostaPrefs] = useState(() =>
    pickMailPostaPreferences(null),
  );
  const [remoteImagesRevealed, setRemoteImagesRevealed] = useState(false);

  const setThreadView = useCallback((enabled: boolean) => {
    setThreadViewState(enabled);
    writeThreadViewPreference(enabled);
  }, []);

  useEffect(() => {
    setThreadViewState(readThreadViewPreference());
    setReadFontScale(initReadFontScale());
  }, []);

  useEffect(() => {
    const onReadFontChange = (event: Event) => {
      const detail = (event as CustomEvent<{ scale: MailReadFontScale }>).detail;
      const scale = detail?.scale ?? readReadFontScale();
      setReadFontScale(scale);
    };
    window.addEventListener(MAIL_READ_FONT_SCALE_CHANGE_EVENT, onReadFontChange);
    return () =>
      window.removeEventListener(
        MAIL_READ_FONT_SCALE_CHANGE_EVENT,
        onReadFontChange,
      );
  }, []);

  const handleMailPostaPreferencesSaved = useCallback(
    (prefs: import("@/lib/mailApi").MailInboxPreferences) => {
      const picked = pickMailPostaPreferences(prefs);
      setMailPostaPrefs(picked);
      setThreadView(picked.threadViewEnabled);
      setReplyAllMode(picked.defaultReplyMode === "reply_all");
    },
    [setThreadView],
  );

  const composeDelaySeconds = useCallback(
    () => composeDelaySecondsFromUndoPref(mailPostaPrefs.undoSendSeconds),
    [mailPostaPrefs.undoSendSeconds],
  );
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
  const [composeCampaignTemplates, setComposeCampaignTemplates] = useState<
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
  const [composePreviewHtml, setComposePreviewHtml] = useState<string | null>(
    null,
  );
  const [composePreviewBusy, setComposePreviewBusy] = useState(false);
  const [composeMergeReferans, setComposeMergeReferans] = useState("");
  const [composeMergeMusteriAdi, setComposeMergeMusteriAdi] = useState("");
  const [composeMergeOpen, setComposeMergeOpen] = useState(false);
  const [composeCampaignMode, setComposeCampaignMode] = useState(false);
  const [composeCampaignRecipients, setComposeCampaignRecipients] =
    useState("");
  const [composeCampaignDelayMs, setComposeCampaignDelayMs] = useState(0);
  const [composeCampaignScheduleAt, setComposeCampaignScheduleAt] = useState("");
  const [composeCampaignSubjectB, setComposeCampaignSubjectB] = useState("");
  const [composeCampaignDomainAllowlist, setComposeCampaignDomainAllowlist] =
    useState("");
  const [composeCampaignNotifyCreator, setComposeCampaignNotifyCreator] =
    useState(false);
  const [composeCampaignSegmentReferansPrefix, setComposeCampaignSegmentReferansPrefix] =
    useState("");
  const [composeCampaignSegmentReferansList, setComposeCampaignSegmentReferansList] =
    useState("");
  const [composeCampaignRequireMusteriAdi, setComposeCampaignRequireMusteriAdi] =
    useState(false);
  const [composeCampaignReminderMinutes, setComposeCampaignReminderMinutes] =
    useState(0);
  const [composeCampaignSegmentPreview, setComposeCampaignSegmentPreview] =
    useState<CampaignSegmentPreview | null>(null);
  const [composeCampaignSegmentPreviewBusy, setComposeCampaignSegmentPreviewBusy] =
    useState(false);
  const [composeCampaignTags, setComposeCampaignTags] = useState("");
  const [composeCampaignHistoryOpen, setComposeCampaignHistoryOpen] =
    useState(false);
  const [campaignResult, setCampaignResult] = useState<ComposeCampaignResult | null>(
    null,
  );
  const [composeInlineAttachments, setComposeInlineAttachments] = useState<
    ComposeAttachment[]
  >([]);
  const [inboxOffline, setInboxOffline] = useState(false);
  const [inboxOfflineCachedAt, setInboxOfflineCachedAt] = useState<
    number | null
  >(null);
  const [sessionExpired, setSessionExpired] = useState(false);
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

  const reLogin = useCallback(() => {
    logout();
    router.replace("/login?oturum=sona-erdi");
  }, [logout, router]);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    try {
      if (view === "calendar" || view === "contacts") {
        const data = await fetchInboxWithOfflineCache(accessToken, "inbox");
        setSummary(data.summary);
        setSendReadiness(data.sendReadiness ?? null);
        setInboxOffline(data.fromOfflineCache);
        setInboxOfflineCachedAt(data.cachedAt);
        setSessionExpired(data.sessionStale);
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
      setSessionExpired(data.sessionStale);
    } catch (error) {
      if (isMailSessionExpiredError(error)) {
        setSessionExpired(true);
        return;
      }
      throw error;
    }
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
      .then((data) => {
        setInboxListDensity(data.preferences.inboxListDensity ?? "comfortable");
        handleMailPostaPreferencesSaved(data.preferences);
      })
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
        setComposeCampaignTemplates(data.campaignTemplates ?? []);
      })
      .catch(() => {
        setComposeTemplates(builtinComposeTemplatesFallback());
        setComposeCampaignTemplates([]);
      });
    void fetchOrgContacts(accessToken)
      .then((data) => {
        setComposeOrgContacts(
          data.contacts.filter((c) => c.email && c.email.trim()),
        );
      })
      .catch(() => setComposeOrgContacts([]));
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
    setRemoteImagesRevealed(false);
    setReplyAllMode(mailPostaPrefs.defaultReplyMode === "reply_all");
    let message: Awaited<
      ReturnType<typeof fetchMessageWithOfflineCache>
    >["message"];
    let fromOfflineCache = false;
    try {
      const loaded = await fetchMessageWithOfflineCache(accessToken, id);
      message = loaded.message;
      fromOfflineCache = loaded.fromOfflineCache;
      if (loaded.sessionStale) {
        setSessionExpired(true);
      }
    } catch (error) {
      if (isMailSessionExpiredError(error)) {
        setSessionExpired(true);
        return;
      }
      throw error;
    }
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
        ...(composeDelaySeconds() !== undefined
          ? { delaySeconds: composeDelaySeconds() }
          : {}),
        merge: buildComposeMergePayload(),
      });
      setReplyText("");
      setReplyFiles([]);
      setReplyAllMode(mailPostaPrefs.defaultReplyMode === "reply_all");
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
    } else if (composeCampaignMode) {
      if (!composeSubject.trim() || !composeText.trim()) {
        setComposeError("Kampanya için konu ve mesaj zorunlu.");
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
      const fileAttachments =
        composeFiles.length > 0
          ? await Promise.all(composeFiles.map((f) => fileToAttachment(f)))
          : [];
      const attachments = [
        ...composeInlineAttachments,
        ...composeStoredAttachments,
        ...fileAttachments,
      ];
      if (attachments.length > 3) {
        setComposeError("En fazla 3 ek (satır içi görseller dahil).");
        setSending(false);
        return;
      }
      if (composeCampaignMode && !forwardMessageId && !editingDraftId) {
        const recipients = parseCampaignRecipientsText(composeCampaignRecipients);
        if (recipients.length === 0) {
          setComposeError(
            "Kampanya için alıcı listesi gerekli (satır başına bir e-posta).",
          );
          setSending(false);
          return;
        }
        if (!composeSubject.trim() || !composeText.trim()) {
          setComposeError("Konu ve mesaj zorunlu.");
          setSending(false);
          return;
        }
        const outboundHtml =
          composeRich && composeHtml.trim() ? composeHtml.trim() : undefined;
        const domainAllowlist = composeCampaignDomainAllowlist
          .split(/[,;\s]+/)
          .map((part) => part.trim().replace(/^@+/, ""))
          .filter((part) => part.length > 0);
        const result = await composeCampaign(accessToken, {
          recipients,
          subject: composeSubject.trim(),
          subjectB: composeCampaignSubjectB.trim() || undefined,
          text: composeText,
          html: outboundHtml,
          attachments: attachments.length > 0 ? attachments : undefined,
          merge: buildComposeMergePayload(),
          delayMsBetweenRecipients: composeCampaignDelayMs || undefined,
          scheduleAt: composeCampaignScheduleAt
            ? new Date(composeCampaignScheduleAt).toISOString()
            : undefined,
          recipientDomainAllowlist:
            domainAllowlist.length > 0 ? domainAllowlist : undefined,
          notifyCreator:
            composeCampaignScheduleAt && composeCampaignNotifyCreator
              ? true
              : undefined,
          segment: (() => {
            const allowlist = composeCampaignSegmentReferansList
              .split(/[\n,;]+/)
              .map((part) => part.trim())
              .filter((part) => part.length > 0);
            const hasSegment =
              composeCampaignSegmentReferansPrefix.trim() ||
              composeCampaignRequireMusteriAdi ||
              allowlist.length > 0;
            if (!hasSegment) {
              return undefined;
            }
            return {
              referansPrefix:
                composeCampaignSegmentReferansPrefix.trim() || undefined,
              requireMusteriAdi: composeCampaignRequireMusteriAdi
                ? true
                : undefined,
              referansAllowlist:
                allowlist.length > 0 ? allowlist.slice(0, 50) : undefined,
            };
          })(),
          reminderMinutesBefore:
            composeCampaignScheduleAt && composeCampaignReminderMinutes > 0
              ? composeCampaignReminderMinutes
              : undefined,
          tags: composeCampaignTags
            .split(/[,;]+/)
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
            .slice(0, 8),
        });
        setComposeOpen(false);
        resetCompose();
        if (result.scheduled) {
          setToast(
            `Kampanya zamanlandı (${result.scheduleAt ? new Date(result.scheduleAt).toLocaleString("tr-TR") : ""}).`,
          );
        } else {
          setCampaignResult(result);
          setToast(`Kampanya: ${result.sent}/${result.attempted} gönderildi.`);
        }
        void refresh();
        setSending(false);
        return;
      }
      if (editingDraftId) {
        await updateDraft(accessToken, editingDraftId, {
          to: composeTo.trim(),
          subject: composeSubject.trim(),
          text: composeText,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
        const draftResult = await sendDraft(accessToken, editingDraftId, {
          ...(composeDelaySeconds() !== undefined
            ? { delaySeconds: composeDelaySeconds() }
            : {}),
        });
        if (applyDelayedSend(draftResult)) {
          scheduledUndo = true;
          setComposeOpen(false);
          setEditingDraftId(null);
          setSending(false);
          void refreshDrafts();
          return;
        }
      } else {
        if (forwardMessageId) {
          const forwardResult = await forwardMail(
            accessToken,
            forwardMessageId,
            {
              to: composeTo.trim(),
              text: composeText.trim() || undefined,
              includeOriginal: true,
              attachments: attachments.length > 0 ? attachments : undefined,
              ...(composeDelaySeconds() !== undefined
                ? { delaySeconds: composeDelaySeconds() }
                : {}),
              merge: buildComposeMergePayload(),
            },
          );
          if (applyDelayedSend(forwardResult)) {
            scheduledUndo = true;
            setComposeOpen(false);
            setForwardMessageId(null);
            setSending(false);
            void refreshDrafts();
            return;
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
            ...(composeDelaySeconds() !== undefined
              ? { delaySeconds: composeDelaySeconds() }
              : {}),
            merge: buildComposeMergePayload(),
          });
          if (applyDelayedSend(result)) {
            scheduledUndo = true;
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
            setSending(false);
            void refreshDrafts();
            return;
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

  function messageKindForId(id: string): "inbound" | "sent" {
    if (view === "sent") {
      return "sent";
    }
    const row = messages.find((m) => m.id === id);
    if (row?.messageKind === "sent") {
      return "sent";
    }
    return "inbound";
  }

  async function openSentById(id: string) {
    if (!accessToken) {
      return;
    }
    setSelectedId(id);
    setDetail(null);
    setDraftPreview(null);
    setSentLoading(true);
    setSentPreview(null);
    try {
      setSentPreview(await fetchSentMessage(accessToken, id));
    } catch {
      const s = sent.find((x) => x.id === id);
      setSentPreview(
        s
          ? {
              ...s,
              fromAddress: summary?.primaryAddress ?? "—",
              bodyText: null,
              bodyHtml: null,
              smtpMessageId: null,
            }
          : null,
      );
    } finally {
      setSentLoading(false);
    }
  }

  async function runBulkRestoreFromTrash() {
    if (!accessToken || checkedIds.size === 0) {
      return;
    }
    const ids = [...checkedIds];
    try {
      let restored = 0;
      for (const id of ids) {
        if (messageKindForId(id) === "sent") {
          await restoreSentFromTrash(accessToken, id);
        } else {
          await setMessageMailboxFolder(accessToken, id, "inbox");
        }
        restored += 1;
      }
      setToast(`${restored} mesaj geri alındı.`);
      setCheckedIds(new Set());
      setDetail(null);
      setSelectedId(null);
      setSentPreview(null);
      void refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Geri alınamadı.");
    }
  }

  async function runBulkPurgeTrash() {
    if (!accessToken || checkedIds.size === 0) {
      return;
    }
    if (
      mailPostaPrefs.confirmBulkDelete &&
      !window.confirm(
        `${checkedIds.size} mesaj kalıcı olarak silinecek. Emin misiniz?`,
      )
    ) {
      return;
    }
    const ids = [...checkedIds];
    try {
      let purged = 0;
      for (const id of ids) {
        if (messageKindForId(id) === "sent") {
          await deleteSentMessage(accessToken, id);
        } else {
          await deleteMessagePermanently(accessToken, id);
        }
        purged += 1;
      }
      setToast(`${purged} mesaj kalıcı olarak silindi.`);
      setCheckedIds(new Set());
      setDetail(null);
      setSelectedId(null);
      setSentPreview(null);
      void refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Silinemedi.");
    }
  }

  async function runEmptyTrash() {
    if (!accessToken) {
      return;
    }
    if (
      !window.confirm(
        "Çöp kutusundaki tüm mesajlar kalıcı olarak silinecek. Devam edilsin mi?",
      )
    ) {
      return;
    }
    try {
      const result = await emptyMailTrash(accessToken);
      setToast(
        `${result.deletedTotal} mesaj kalıcı silindi (gelen: ${result.deletedInbound}, gönderilen: ${result.deletedSent}).`,
      );
      setCheckedIds(new Set());
      setDetail(null);
      setSelectedId(null);
      setSentPreview(null);
      void refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Çöp boşaltılamadı.");
    }
  }

  async function restoreCurrentFromTrash() {
    if (!accessToken || !selectedId) {
      return;
    }
    try {
      if (messageKindForId(selectedId) === "sent") {
        await restoreSentFromTrash(accessToken, selectedId);
        setSentPreview(null);
      } else {
        await setMessageMailboxFolder(accessToken, selectedId, "inbox");
        setDetail(null);
      }
      setSelectedId(null);
      setMobilePane("list");
      setToast("Geri alındı.");
      void refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Geri alınamadı.");
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

  function finishAfterMessageNavigation(closedId: string | null) {
    const mode = mailPostaPrefs.afterMessageAction;
    if (!closedId || mode === "list") {
      setDetail(null);
      setSelectedId(null);
      setActiveThreadId(null);
      setThreadMessages([]);
      setMobilePane("list");
      return;
    }
    const ids = listMessageIdsRef.current;
    const idx = ids.indexOf(closedId);
    let target: string | undefined;
    if (mode === "next" && idx >= 0) {
      target = ids[idx + 1] ?? ids[idx - 1];
    } else if (mode === "previous" && idx >= 0) {
      target = ids[idx - 1] ?? ids[idx + 1];
    }
    if (target) {
      void openMessage(target);
      return;
    }
    setDetail(null);
    setSelectedId(null);
    setActiveThreadId(null);
    setThreadMessages([]);
    setMobilePane("list");
  }

  async function moveCurrentMessage(folder: MailMailboxFolder) {
    if (!accessToken || !selectedId) {
      return;
    }
    const closedId = selectedId;
    try {
      await setMessageMailboxFolder(accessToken, selectedId, folder);
      setToast(
        folder === "trash"
          ? "Çöp kutusuna taşındı."
          : folder === "archive"
            ? "Arşivlendi."
            : "Gelen kutusuna alındı.",
      );
      finishAfterMessageNavigation(closedId);
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
    if (
      mailPostaPrefs.confirmPermanentDelete &&
      !window.confirm("Bu mesaj kalıcı olarak silinecek. Emin misiniz?")
    ) {
      return;
    }
    const closedId = selectedId;
    try {
      if (messageKindForId(selectedId) === "sent") {
        await deleteSentMessage(accessToken, selectedId);
        setSentPreview(null);
      } else {
        await deleteMessagePermanently(accessToken, selectedId);
        setDetail(null);
      }
      setToast("Kalıcı olarak silindi.");
      finishAfterMessageNavigation(closedId);
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
  listMessageIdsRef.current = listMessageIds;

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
    setComposeMergeReferans("");
    setComposeMergeMusteriAdi("");
    setComposeMergeOpen(false);
    setComposeCampaignMode(false);
    setComposeCampaignRecipients("");
    setComposeCampaignDelayMs(0);
    setComposeCampaignScheduleAt("");
    setComposeCampaignSubjectB("");
    setComposeCampaignDomainAllowlist("");
    setComposeCampaignNotifyCreator(false);
    setComposeCampaignSegmentReferansPrefix("");
    setComposeCampaignSegmentReferansList("");
    setComposeCampaignRequireMusteriAdi(false);
    setComposeCampaignReminderMinutes(0);
    setComposeCampaignSegmentPreview(null);
    setComposeCampaignTags("");
    setComposeInlineAttachments([]);
  }

  async function runCampaignSegmentPreview() {
    if (!accessToken) {
      return;
    }
    const recipients = parseCampaignRecipientsText(composeCampaignRecipients);
    if (recipients.length === 0) {
      setToast("Önizleme için alıcı listesi gerekli.");
      return;
    }
    const domainAllowlist = composeCampaignDomainAllowlist
      .split(/[,;\s]+/)
      .map((part) => part.trim().replace(/^@+/, ""))
      .filter((part) => part.length > 0);
    const allowlist = composeCampaignSegmentReferansList
      .split(/[\n,;]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    setComposeCampaignSegmentPreviewBusy(true);
    try {
      const result = await previewCampaignSegment(accessToken, {
        recipients,
        merge: buildComposeMergePayload(),
        recipientDomainAllowlist:
          domainAllowlist.length > 0 ? domainAllowlist : undefined,
        segment:
          composeCampaignSegmentReferansPrefix.trim() ||
          composeCampaignRequireMusteriAdi ||
          allowlist.length > 0
            ? {
                referansPrefix:
                  composeCampaignSegmentReferansPrefix.trim() || undefined,
                requireMusteriAdi: composeCampaignRequireMusteriAdi
                  ? true
                  : undefined,
                referansAllowlist:
                  allowlist.length > 0 ? allowlist.slice(0, 50) : undefined,
              }
            : undefined,
      });
      setComposeCampaignSegmentPreview(result.preview);
    } catch {
      setToast("Segment önizlemesi alınamadı.");
    } finally {
      setComposeCampaignSegmentPreviewBusy(false);
    }
  }

  useEffect(() => {
    if (!composeOpen || !composeCampaignMode || !accessToken) {
      return;
    }
    const recipients = parseCampaignRecipientsText(composeCampaignRecipients);
    if (recipients.length === 0) {
      setComposeCampaignSegmentPreview(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void runCampaignSegmentPreview();
    }, 650);
    return () => window.clearTimeout(timer);
  }, [
    accessToken,
    composeOpen,
    composeCampaignMode,
    composeCampaignRecipients,
    composeCampaignDomainAllowlist,
    composeCampaignSegmentReferansPrefix,
    composeCampaignSegmentReferansList,
    composeCampaignRequireMusteriAdi,
    composeMergeReferans,
    composeMergeMusteriAdi,
  ]);

  function applyCampaignClonePayload(compose: import("@/lib/mailApi").MailCampaignComposeClone) {
    setComposeCampaignMode(true);
    setComposeOpen(true);
    setComposeSubject(compose.subject);
    setComposeCampaignSubjectB(compose.subjectB ?? "");
    setComposeText(compose.text);
    if (compose.html?.trim()) {
      setComposeHtml(compose.html.trim());
      setComposeRich(true);
    }
    setComposeCampaignRecipients(
      compose.recipients
        .map((row) =>
          [row.email, row.musteriAdi, row.referans].filter(Boolean).join(", "),
        )
        .join("\n"),
    );
    setComposeCampaignDomainAllowlist(
      compose.recipientDomainAllowlist?.join(", ") ?? "",
    );
    setComposeCampaignDelayMs(compose.delayMsBetweenRecipients ?? 0);
    setComposeCampaignSegmentReferansPrefix(
      compose.segment?.referansPrefix ?? "",
    );
    setComposeCampaignRequireMusteriAdi(
      Boolean(compose.segment?.requireMusteriAdi),
    );
    setComposeCampaignSegmentReferansList(
      compose.segment?.referansAllowlist?.join("\n") ?? "",
    );
    setComposeMergeReferans(compose.merge?.referans ?? "");
    setComposeMergeMusteriAdi(compose.merge?.musteriAdi ?? "");
    setComposeCampaignNotifyCreator(Boolean(compose.notifyCreator));
    setComposeCampaignReminderMinutes(compose.reminderMinutesBefore ?? 0);
    setComposeCampaignTags(compose.tags?.join(", ") ?? "");
    setComposeCampaignSegmentPreview(null);
    setToast("Kampanya yazı ekranına kopyalandı.");
  }

  async function importCampaignCsv(file: File) {
    const text = await file.text();
    const rows = parseCampaignCsvText(text);
    if (rows.length === 0) {
      setToast("CSV’den geçerli alıcı bulunamadı.");
      return;
    }
    setComposeCampaignRecipients((prev) =>
      mergeCampaignRecipientLists(prev, rows),
    );
    setToast(`${rows.length} alıcı CSV’den eklendi.`);
  }

  function buildComposeMergePayload() {
    const referans = composeMergeReferans.trim();
    const musteriAdi = composeMergeMusteriAdi.trim();
    if (!referans && !musteriAdi) {
      return undefined;
    }
    return {
      referans: referans || undefined,
      musteriAdi: musteriAdi || undefined,
    };
  }

  function insertMergeToken(token: string) {
    setComposeText((prev) => `${prev.replace(/\s*$/, "")}${prev.trim() ? " " : ""}${token}`);
  }

  function insertReplyMergeToken(token: string) {
    setReplyText((prev) => `${prev.replace(/\s*$/, "")}${prev.trim() ? " " : ""}${token}`);
  }

  async function addInlineComposeImage(file: File): Promise<string | null> {
    const total =
      composeInlineAttachments.length +
      composeFiles.length +
      composeStoredAttachments.length;
    if (total >= 3) {
      setToast("En fazla 3 ek (satır içi görseller dahil).");
      return null;
    }
    if (!file.type.startsWith("image/")) {
      setToast("Yalnızca görsel dosyaları desteklenir.");
      return null;
    }
    const cid = `img_${Date.now()}`;
    const att = await fileToAttachment(file, { contentId: cid });
    setComposeInlineAttachments((prev) => [...prev, att]);
    return cid;
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

  function closeComposePreview() {
    setComposePreviewHtml(null);
  }

  async function previewComposeOutbound() {
    if (!accessToken || !composeText.trim()) {
      setComposeError("Önizleme için mesaj metni gerekli.");
      return;
    }
    const outboundHtml =
      composeRich && composeHtml.trim() && !forwardMessageId
        ? composeHtml.trim()
        : undefined;
    setComposeError("");
    setComposePreviewBusy(true);
    try {
      const result = await fetchComposeOutboundPreview(accessToken, {
        text: composeText,
        html: outboundHtml,
        to: composeTo.trim() || undefined,
        merge: buildComposeMergePayload(),
      });
      setComposePreviewHtml(result.html);
    } catch {
      setComposeError("Alıcı görünümü önizlemesi oluşturulamadı.");
    } finally {
      setComposePreviewBusy(false);
    }
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
    if (preset.bodyHtml?.trim()) {
      setComposeHtml(preset.bodyHtml.trim());
      setComposeRich(true);
    }
  }

  function applyComposeCampaignTemplate(presetId: string) {
    const preset = composeCampaignTemplates.find((t) => t.id === presetId);
    if (!preset) {
      return;
    }
    if (preset.subject) {
      setComposeSubject(preset.subject);
    }
    setComposeText(preset.bodyText);
    if (preset.bodyHtml?.trim()) {
      setComposeHtml(preset.bodyHtml.trim());
      setComposeRich(true);
    }
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
    applyComposeCampaignTemplate,
    applyDelayedSend,
    applyMessageReadLocal,
    canBulkSelect,
    canUseThreads,
    cancelPendingUndo,
    closeComposePreview,
    checkboxAnchorRef,
    checkedIds,
    clearRowSelectionAfterSwipe,
    composeBcc,
    composeCc,
    composeError,
    composeFiles,
    composeHtml,
    composeOpen,
    composeOrgContacts,
    composePreviewBusy,
    composePreviewHtml,
    composeRich,
    composeShowCcBcc,
    composeSignatures,
    composeStoredAttachments,
    composeSubject,
    composeTemplates,
    composeCampaignTemplates,
    composeText,
    composeTo,
    composeMergeReferans,
    composeMergeMusteriAdi,
    composeMergeOpen,
    setComposeMergeReferans,
    setComposeMergeMusteriAdi,
    setComposeMergeOpen,
    insertMergeToken,
    insertReplyMergeToken,
    composeCampaignMode,
    setComposeCampaignMode,
    composeCampaignRecipients,
    setComposeCampaignRecipients,
    maxCampaignRecipients: MAX_CAMPAIGN_RECIPIENTS,
    composeCampaignDelayMs,
    setComposeCampaignDelayMs,
    composeCampaignScheduleAt,
    setComposeCampaignScheduleAt,
    composeCampaignSubjectB,
    setComposeCampaignSubjectB,
    composeCampaignDomainAllowlist,
    setComposeCampaignDomainAllowlist,
    composeCampaignNotifyCreator,
    setComposeCampaignNotifyCreator,
    composeCampaignSegmentReferansPrefix,
    setComposeCampaignSegmentReferansPrefix,
    composeCampaignSegmentReferansList,
    setComposeCampaignSegmentReferansList,
    composeCampaignRequireMusteriAdi,
    setComposeCampaignRequireMusteriAdi,
    composeCampaignReminderMinutes,
    setComposeCampaignReminderMinutes,
    composeCampaignTags,
    setComposeCampaignTags,
    composeCampaignSegmentPreview,
    composeCampaignSegmentPreviewBusy,
    runCampaignSegmentPreview,
    applyCampaignClonePayload,
    composeCampaignHistoryOpen,
    setComposeCampaignHistoryOpen,
    campaignResult,
    setCampaignResult,
    importCampaignCsv,
    addInlineComposeImage,
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
    embedHubShell,
    shellBrand,
    ensureAiMailConsent,
    getMessageHtmlForRead: (rawHtml: string | null) => {
      if (!rawHtml) {
        return null;
      }
      const withImages = applyRemoteImagesPolicyToHtml(
        rawHtml,
        mailPostaPrefs.remoteImagesPolicy,
        remoteImagesRevealed,
      );
      return applyReadFontScaleToHtml(withImages, readFontScale);
    },
    readFontScale,
    handleMailPostaPreferencesSaved,
    shouldPromptRemoteImages: (rawHtml: string | null) =>
      rawHtml
        ? htmlHasBlockedRemoteImages(
            rawHtml,
            mailPostaPrefs.remoteImagesPolicy,
            remoteImagesRevealed,
          )
        : false,
    setRemoteImagesRevealed,
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
    previewComposeOutbound,
    purgeCurrentMessage,
    openSentById,
    restoreCurrentFromTrash,
    runBulkPurgeTrash,
    runBulkRestoreFromTrash,
    runEmptyTrash,
    refresh,
    refreshCustomFolders,
    refreshDrafts,
    reLogin,
    sessionExpired,
    removeMessageFromLocalLists,
    replyAllMode,
    defaultReplyIsAll: mailPostaPrefs.defaultReplyMode === "reply_all",
    composeDelaySeconds,
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
