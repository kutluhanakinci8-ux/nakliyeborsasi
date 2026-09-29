"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MessagingMailWebEmbed } from "../../../components/messaging/MessagingMailWebEmbed";
import { ChatMessageBody } from "../../../components/messaging/ChatMessageBody";
import { ChatMessageActionBar } from "../../../components/messaging/ChatMessageActionBar";
import { ChatStatsRail } from "../../../components/messaging/ChatStatsRail";
import { ChatThreadListItem } from "../../../components/messaging/ChatThreadListItem";
import {
  IconChannels,
  IconLockNote,
  IconMessageSquare,
  IconPaperclip,
  IconSearch,
  IconSend,
  IconSparkles,
  IconStickyNote,
  IconTemplate,
  IconUsers,
} from "../../../components/messaging/ChatUiIcons";
import { MessagingChannelSettingsPanel } from "../../../components/messaging/MessagingChannelSettingsPanel";
import {
  ChatGroupThreadModal,
  ChatMessageDeleteModal,
  ChatMessageEditModal,
  ChatQuickReplyAdminModal,
} from "../../../components/messaging/ChatMessagingModals";
import { EmptyState } from "../../../components/EmptyState";
import { ModulePageShell } from "../../../components/ModulePageShell";
import { useWebSession } from "../../../context/WebSessionProvider";
import {
  MessagingApiClient,
  MessagingListingCardRecord,
  MessagingOfferTimelineEntryRecord,
  MessagingOrgQuickReplyRecord,
  MessagingQuickReplyRecord,
  MessagingCompanySearchRecord,
  MessagingSearchResultRecord,
  MessagingThreadRecord,
  MessagingThreadSummaryRecord,
  ThreadMessageRecord,
} from "../../../lib/MessagingApiClient";
import {
  TrustScoreApiClient,
  TrustScoreRecord,
} from "../../../lib/TrustScoreApiClient";
import { ensureMessagingWebPush } from "../../../lib/messagingPush";
import {
  companyInitials,
  dayKeyFromIso,
  formatChatDayLabel,
  groupParticipantRoleLabel,
  highlightSearchSnippet,
  operationStampLabel,
  type MessagingOperationStampType,
} from "../../../lib/messagingChatUi";

type PendingAttachment = {
  filename: string;
  contentType: string;
  contentBase64: string;
  previewUrl?: string;
};

async function readFileAsAttachment(file: File): Promise<PendingAttachment> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  const contentType = file.type || "application/octet-stream";
  const previewUrl =
    contentType.startsWith("image/") ? URL.createObjectURL(file) : undefined;
  return {
    filename: file.name,
    contentType,
    contentBase64: btoa(binary),
    previewUrl,
  };
}

function messageHasActiveMentionQuery(body: string): boolean {
  return /@([^\s]*)$/.test(body);
}

type MessagingMode = "chat" | "email";

const MESSAGING_TAB_STORAGE_KEY = "lerta.messaging.lastTab";

function rememberMessagingTab(mode: MessagingMode): void {
  try {
    window.localStorage.setItem(MESSAGING_TAB_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function readStoredMessagingTab(): MessagingMode | null {
  try {
    const raw = window.localStorage.getItem(MESSAGING_TAB_STORAGE_KEY);
    if (raw === "chat" || raw === "email") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function participantTypeLabel(code: string | null | undefined): string {
  switch (code) {
    case "LOAD_SHIPPER":
      return "Yükveren";
    case "LOAD_CARRIER":
      return "Taşıyıcı";
    case "LOAD_SEEKER":
      return "Yük arayan";
    default:
      return "Firma";
  }
}

function shortCompanyId(companyId: string): string {
  if (companyId.length <= 12) {
    return companyId;
  }
  return `${companyId.slice(0, 8)}…${companyId.slice(-4)}`;
}

const COMPANY_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseCompanyUuidCandidate(raw: string): string | null {
  const trimmed = raw.trim();
  return COMPANY_UUID_RE.test(trimmed) ? trimmed : null;
}

function parseMode(
  raw: string | null,
  preferChat: boolean,
): MessagingMode {
  if (raw === "chat" || raw === "sohbet") {
    return "chat";
  }
  if (raw === "email" || raw === "posta" || raw === "mail") {
    return "email";
  }
  if (preferChat) {
    return "chat";
  }
  return "email";
}

export function MessagingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, locale, session } = useWebSession();
  const preferChat =
    Boolean(searchParams.get("companyId")) ||
    Boolean(searchParams.get("threadId"));
  const [mode, setMode] = useState<MessagingMode>(() =>
    parseMode(searchParams.get("tab"), preferChat),
  );
  const [threads, setThreads] = useState<MessagingThreadRecord[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messages, setMessages] = useState<ThreadMessageRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [acceptOfferBusy, setAcceptOfferBusy] = useState(false);
  const [mailEmbedFullscreen, setMailEmbedFullscreen] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");
  const [chatSearchFocused, setChatSearchFocused] = useState(false);
  const [counterpartyTrust, setCounterpartyTrust] =
    useState<TrustScoreRecord | null>(null);
  const [moduleBlocked, setModuleBlocked] = useState(false);
  const [threadSummary, setThreadSummary] =
    useState<MessagingThreadSummaryRecord | null>(null);
  const [listingCard, setListingCard] =
    useState<MessagingListingCardRecord | null>(null);
  const [offerTimeline, setOfferTimeline] = useState<
    MessagingOfferTimelineEntryRecord[]
  >([]);
  const [llmSummary, setLlmSummary] = useState<string | null>(null);
  const [llmBusy, setLlmBusy] = useState(false);
  const [serverSearchHits, setServerSearchHits] = useState<
    MessagingSearchResultRecord[]
  >([]);
  const [companySearchHits, setCompanySearchHits] = useState<
    MessagingCompanySearchRecord[]
  >([]);
  const [quickReplies, setQuickReplies] = useState<MessagingQuickReplyRecord[]>(
    [],
  );
  const [internalNote, setInternalNote] = useState(false);
  const [typingHint, setTypingHint] = useState("");
  const [colleagues, setColleagues] = useState<
    { userId: string; displayName: string; mentionToken: string }[]
  >([]);
  const typingPingRef = useRef(0);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
  const [mentionPickIndex, setMentionPickIndex] = useState(0);
  const templateSelectRef = useRef<HTMLSelectElement>(null);
  const [internalNotesOnly, setInternalNotesOnly] = useState(false);
  const [editMessage, setEditMessage] = useState<{
    id: string;
    bodyText: string;
  } | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [messageActionBusy, setMessageActionBusy] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupSearchHits, setGroupSearchHits] = useState<
    MessagingCompanySearchRecord[]
  >([]);
  const [groupSelected, setGroupSelected] = useState<
    MessagingCompanySearchRecord[]
  >([]);
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(
    null,
  );
  const [contextPinCollapsed, setContextPinCollapsed] = useState(false);
  const [quotedMessage, setQuotedMessage] = useState<{
    id: string;
    preview: string;
  } | null>(null);
  const [composeDragActive, setComposeDragActive] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [translateBusyId, setTranslateBusyId] = useState("");
  const [stampBusyId, setStampBusyId] = useState("");
  const [quickReplyAdminOpen, setQuickReplyAdminOpen] = useState(false);
  const [orgQuickReplyDrafts, setOrgQuickReplyDrafts] = useState<
    MessagingOrgQuickReplyRecord[]
  >([]);
  const [quickReplyAdminBusy, setQuickReplyAdminBusy] = useState(false);
  const [channelSettingsOpen, setChannelSettingsOpen] = useState(false);
  const [offerTimelineOpen, setOfferTimelineOpen] = useState(false);
  const [groupParticipants, setGroupParticipants] = useState<
    {
      companyId: string;
      legalName: string | null;
      participantRole: string;
    }[]
  >([]);
  const deepLinkHandledKey = useRef<string | null>(null);
  const isCompanyOwner =
    session?.roleCodes?.includes("COMPANY_OWNER") ?? false;

  const mentionNameByUserId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const colleague of colleagues) {
      const match = colleague.mentionToken.match(
        /@\{([0-9a-f-]{36})\}/i,
      );
      if (match) {
        map[match[1].toLowerCase()] = colleague.displayName;
      }
    }
    return map;
  }, [colleagues]);

  const displayedMessages = useMemo(() => {
    if (!internalNotesOnly) {
      return messages;
    }
    return messages.filter((row) => row.messageKind === "internal");
  }, [messages, internalNotesOnly]);

  useEffect(() => {
    setOfferTimelineOpen(false);
  }, [activeThreadId]);

  useEffect(() => {
    if (!scrollToMessageId) {
      return;
    }
    const element = document.getElementById(`chat-msg-${scrollToMessageId}`);
    if (!element) {
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setScrollToMessageId(null), 2600);
    return () => window.clearTimeout(timer);
  }, [messages, scrollToMessageId]);

  useEffect(() => {
    return () => {
      for (const file of pendingAttachments) {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      }
    };
  }, [pendingAttachments]);

  const mentionDropdownOpen = useMemo(() => {
    if (colleagues.length === 0) {
      return false;
    }
    return mentionMenuOpen || messageHasActiveMentionQuery(messageBody);
  }, [colleagues.length, mentionMenuOpen, messageBody]);

  const mentionSuggestions = useMemo(() => {
    const match = messageBody.match(/@([^\s]*)$/);
    const query = match ? match[1].toLowerCase() : "";
    return colleagues
      .filter((row) => {
        if (!query) {
          return true;
        }
        return (
          row.displayName.toLowerCase().includes(query) ||
          row.mentionToken.toLowerCase().includes(query)
        );
      })
      .slice(0, 8);
  }, [colleagues, messageBody]);

  function applyColleagueMention(colleague: {
    displayName: string;
    mentionToken: string;
  }): void {
    setMessageBody((current) => {
      if (messageHasActiveMentionQuery(current)) {
        return current.replace(/@([^\s]*)$/, `${colleague.mentionToken} `);
      }
      const spacer =
        current.length > 0 && !current.endsWith(" ") ? " " : "";
      return `${current}${spacer}${colleague.mentionToken} `;
    });
    setMentionMenuOpen(false);
    setMentionPickIndex(0);
    requestAnimationFrame(() => messageInputRef.current?.focus());
  }

  useEffect(() => {
    setMentionPickIndex(0);
  }, [mentionSuggestions]);

  useEffect(() => {
    const chatLink =
      Boolean(searchParams.get("companyId")) ||
      Boolean(searchParams.get("threadId"));
    const mailComposeLink =
      Boolean(searchParams.get("composeTo")) ||
      Boolean(searchParams.get("email"));
    if (mailComposeLink) {
      setMode("email");
    } else {
      setMode(parseMode(searchParams.get("tab"), chatLink));
    }
    const tab = searchParams.get("tab");
    if (!tab && !chatLink && !mailComposeLink) {
      const stored = readStoredMessagingTab();
      const fallbackTab = stored === "chat" ? "sohbet" : "email";
      if (!accessToken) {
        router.replace(`/messaging?tab=${fallbackTab}`, { scroll: false });
      } else {
        void MessagingApiClient.fetchMessagingHubDefault(accessToken, locale)
          .then((payload) => {
            const next =
              stored ??
              (payload.defaultTab === "chat" ? "chat" : "email");
            const tabParam = next === "chat" ? "sohbet" : "email";
            router.replace(`/messaging?tab=${tabParam}`, { scroll: false });
          })
          .catch(() => {
            router.replace(`/messaging?tab=${fallbackTab}`, { scroll: false });
          });
      }
    }
    const rawEmail = searchParams.get("email")?.trim();
    if (rawEmail && !searchParams.get("composeTo")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "email");
      params.set("composeTo", rawEmail);
      params.delete("email");
      router.replace(`/messaging?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, router, accessToken, locale]);

  function switchMode(next: MessagingMode): void {
    setMode(next);
    rememberMessagingTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "email") {
      params.set("tab", "email");
    } else {
      params.set("tab", "chat");
    }
    const query = params.toString();
    router.replace(query ? `/messaging?${query}` : "/messaging", {
      scroll: false,
    });
  }

  const loadThreads = useCallback(async (): Promise<void> => {
    try {
      const payload = await MessagingApiClient.listThreads(accessToken, locale);
      setThreads(payload.threads ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Yükleme hatası";
      if (/messaging|modül|entitlement|abonelik/i.test(message)) {
        setModuleBlocked(true);
      }
      setErrorMessage(message);
    }
  }, [accessToken, locale]);

  useEffect(() => {
    if (mode === "chat") {
      void loadThreads();
    }
  }, [accessToken, locale, mode, loadThreads]);

  async function openThreadWithCounterparty(companyId: string): Promise<void> {
    const normalized = companyId.trim();
    if (!normalized) {
      setErrorMessage("Karşı firma kimliği girin.");
      return;
    }
    setIsBusy(true);
    setErrorMessage("");
    try {
      const listingId = searchParams.get("listingId")?.trim();
      const payload = await MessagingApiClient.openThread(
        accessToken,
        locale,
        normalized,
        listingId || undefined,
      );
      const threadId =
        (payload.thread as { id?: string; threadId?: string }).id ??
        (payload.thread as { threadId?: string }).threadId ??
        "";
      if (!threadId) {
        throw new Error("Sohbet kimliği alınamadı");
      }
      setActiveThreadId(threadId);
      setThreadSearch("");
      setChatSearchFocused(false);
      await loadThreads();
      await loadMessages(threadId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sohbet hatası");
    } finally {
      setIsBusy(false);
    }
  }

  async function createGroupThread(): Promise<void> {
    if (groupSelected.length < 2) {
      setErrorMessage("Grup için en az iki karşı firma seçin.");
      return;
    }
    setIsBusy(true);
    setErrorMessage("");
    try {
      const payload = await MessagingApiClient.openGroupThread(
        accessToken,
        locale,
        groupSelected.map((row) => row.companyId),
        {
          title: groupTitle.trim() || undefined,
          freightListingId: searchParams.get("listingId")?.trim() || undefined,
        },
      );
      const threadId =
        (payload.thread as { id?: string }).id ??
        (payload.thread as { threadId?: string }).threadId ??
        "";
      if (!threadId) {
        throw new Error("Grup sohbet kimliği alınamadı");
      }
      setGroupModalOpen(false);
      setGroupTitle("");
      setGroupSearchQuery("");
      setGroupSelected([]);
      setActiveThreadId(threadId);
      await loadThreads();
      await loadMessages(threadId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Grup sohbet hatası",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function saveEditedMessage(): Promise<void> {
    if (!editMessage?.bodyText.trim() || !activeThreadId) {
      return;
    }
    setMessageActionBusy(true);
    try {
      await MessagingApiClient.updateMessage(
        accessToken,
        locale,
        activeThreadId,
        editMessage.id,
        editMessage.bodyText.trim(),
      );
      setEditMessage(null);
      await loadMessages(activeThreadId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Düzenleme hatası",
      );
    } finally {
      setMessageActionBusy(false);
    }
  }

  async function confirmDeleteMessage(): Promise<void> {
    if (!deleteMessageId || !activeThreadId) {
      return;
    }
    setMessageActionBusy(true);
    try {
      await MessagingApiClient.deleteMessage(
        accessToken,
        locale,
        activeThreadId,
        deleteMessageId,
      );
      setDeleteMessageId(null);
      await loadMessages(activeThreadId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Silme hatası");
    } finally {
      setMessageActionBusy(false);
    }
  }

  async function addPendingFiles(fileList: FileList | File[]): Promise<void> {
    if (!activeThreadId) {
      return;
    }
    for (const file of Array.from(fileList)) {
      if (pendingAttachments.length >= 5) {
        setErrorMessage("En fazla 5 dosya ekleyebilirsiniz.");
        break;
      }
      if (file.size > 10_000_000) {
        setErrorMessage("Tek dosya en fazla 10 MB olabilir.");
        continue;
      }
      try {
        const attachment = await readFileAsAttachment(file);
        setPendingAttachments((current) =>
          [...current, attachment].slice(0, 5),
        );
      } catch {
        setErrorMessage("Dosya okunamadı (en fazla 5 dosya, 10 MB).");
      }
    }
  }

  async function handleOperationStamp(
    messageId: string,
    stampType: MessagingOperationStampType,
  ): Promise<void> {
    if (!activeThreadId) {
      return;
    }
    setStampBusyId(messageId);
    try {
      await MessagingApiClient.stampMessage(
        accessToken,
        locale,
        activeThreadId,
        messageId,
        stampType,
      );
      await loadMessages(activeThreadId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Damga eklenemedi",
      );
    } finally {
      setStampBusyId("");
    }
  }

  async function openQuickReplyAdmin(): Promise<void> {
    setQuickReplyAdminBusy(true);
    try {
      const payload = await MessagingApiClient.fetchOrgQuickReplies(
        accessToken,
        locale,
      );
      setOrgQuickReplyDrafts(payload.templates ?? []);
      setQuickReplyAdminOpen(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Şablonlar yüklenemedi",
      );
    } finally {
      setQuickReplyAdminBusy(false);
    }
  }

  async function saveOrgQuickReplies(): Promise<void> {
    setQuickReplyAdminBusy(true);
    try {
      const payload = await MessagingApiClient.saveOrgQuickReplies(
        accessToken,
        locale,
        orgQuickReplyDrafts,
      );
      setOrgQuickReplyDrafts(payload.templates ?? []);
      setQuickReplyAdminOpen(false);
      const quick = await MessagingApiClient.fetchQuickReplies(
        accessToken,
        locale,
      );
      setQuickReplies(quick.templates ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Şablonlar kaydedilemedi",
      );
    } finally {
      setQuickReplyAdminBusy(false);
    }
  }

  async function jumpToSearchHit(
    hit: MessagingSearchResultRecord,
  ): Promise<void> {
    setScrollToMessageId(hit.messageId);
    setActiveThreadId(hit.threadId);
    setMobileThreadOpen(true);
    setThreadSearch("");
    setChatSearchFocused(false);
    await loadMessages(hit.threadId);
  }

  const loadMessages = useCallback(
    async (threadId: string): Promise<void> => {
      setActiveThreadId(threadId);
      try {
        const payload = await MessagingApiClient.listMessages(
          accessToken,
          locale,
          threadId,
        );
        setMessages(payload.messages ?? []);
        void loadThreads();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Mesaj hatası");
      }
    },
    [accessToken, locale],
  );

  useEffect(() => {
    const companyId = searchParams.get("companyId");
    if (companyId) {
      setThreadSearch(companyId);
    }
    const threadId = searchParams.get("threadId");
    if (threadId) {
      void loadMessages(threadId);
    }
  }, [searchParams, loadMessages]);

  useEffect(() => {
    if (mode !== "chat" || !accessToken || moduleBlocked) {
      return;
    }
    const threadIdParam = searchParams.get("threadId")?.trim();
    if (threadIdParam) {
      return;
    }
    const companyId = searchParams.get("companyId")?.trim();
    if (!companyId) {
      return;
    }
    const listingId = searchParams.get("listingId")?.trim() ?? "";
    const deepKey = `${companyId}:${listingId}`;
    if (deepLinkHandledKey.current === deepKey) {
      return;
    }
    deepLinkHandledKey.current = deepKey;

    void (async () => {
      setIsBusy(true);
      setErrorMessage("");
      try {
        const listed = await MessagingApiClient.listThreads(
          accessToken,
          locale,
        );
        const candidates = (listed.threads ?? []).filter(
          (t) => t.counterpartyCompanyId === companyId,
        );
        const match =
          candidates
            .filter((t) => !listingId || t.freightListingId === listingId)
            .sort((a, b) =>
              (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""),
            )[0] ?? null;

        let resolvedThreadId = match?.threadId ?? "";
        if (!resolvedThreadId) {
          const opened = await MessagingApiClient.openThread(
            accessToken,
            locale,
            companyId,
            listingId || undefined,
          );
          resolvedThreadId =
            (opened.thread as { id?: string; threadId?: string }).id ??
            (opened.thread as { threadId?: string }).threadId ??
            "";
        }
        if (!resolvedThreadId) {
          throw new Error("Sohbet kimliği alınamadı");
        }
        await loadMessages(resolvedThreadId);
        await loadThreads();
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", "chat");
        params.set("threadId", resolvedThreadId);
        params.delete("companyId");
        params.delete("listingId");
        router.replace(`/messaging?${params.toString()}`, { scroll: false });
      } catch (error) {
        deepLinkHandledKey.current = null;
        setErrorMessage(
          error instanceof Error ? error.message : "Sohbet açılamadı",
        );
      } finally {
        setIsBusy(false);
      }
    })();
  }, [
    mode,
    accessToken,
    locale,
    moduleBlocked,
    searchParams,
    loadMessages,
    router,
  ]);

  async function handleExportArchive(): Promise<void> {
    try {
      const payload = await MessagingApiClient.exportArchive(
        accessToken,
        locale,
      );
      const blob = new Blob([JSON.stringify(payload.export, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lerta-messaging-export-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Dışa aktarma hatası",
      );
    }
  }

  async function handleTranslateMessage(
    message: ThreadMessageRecord,
    targetLocale: string,
  ): Promise<void> {
    setTranslateBusyId(message.id);
    try {
      const result = await MessagingApiClient.translateMessage(
        accessToken,
        locale,
        message.bodyText,
        targetLocale,
      );
      setTranslations((current) => ({
        ...current,
        [message.id]: result.translatedText,
      }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Çeviri yapılamadı",
      );
    } finally {
      setTranslateBusyId("");
    }
  }

  async function handleSendMessage(): Promise<void> {
    if (
      !activeThreadId ||
      (!messageBody.trim() && pendingAttachments.length === 0)
    ) {
      return;
    }
    try {
      let outbound = messageBody.trim();
      if (quotedMessage) {
        const quoteBlock = quotedMessage.preview
          .split("\n")
          .slice(0, 4)
          .map((line) => `> ${line}`)
          .join("\n");
        outbound = `${quoteBlock}\n\n${outbound}`;
      }
      await MessagingApiClient.sendMessage(
        accessToken,
        locale,
        activeThreadId,
        outbound,
        pendingAttachments.length > 0 ? pendingAttachments : undefined,
        internalNote ? "internal" : "public",
      );
      setMessageBody("");
      setQuotedMessage(null);
      setInternalNote(false);
      for (const file of pendingAttachments) {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      }
      setPendingAttachments([]);
      await loadMessages(activeThreadId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gönderim hatası");
    }
  }

  async function acceptListingFixedPrice(): Promise<void> {
    if (!accessToken || !activeThreadId || !listingCard?.priceAmount) {
      return;
    }
    setAcceptOfferBusy(true);
    setErrorMessage("");
    try {
      await MessagingApiClient.acceptFixedPriceFromThread(
        accessToken,
        locale,
        activeThreadId,
      );
      await loadMessages(activeThreadId);
      const insights = await MessagingApiClient.fetchThreadInsights(
        accessToken,
        locale,
        activeThreadId,
      );
      setListingCard(insights.listingCard);
      setOfferTimeline(insights.offerTimeline);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Teklif kabul edilemedi",
      );
    } finally {
      setAcceptOfferBusy(false);
    }
  }

  const activeThread = threads.find((t) => t.threadId === activeThreadId);

  const companyLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const thread of threads) {
      if (thread.counterpartyLegalName) {
        map.set(thread.counterpartyCompanyId, thread.counterpartyLegalName);
      }
    }
    if (activeThread?.counterpartyLegalName) {
      map.set(
        activeThread.counterpartyCompanyId,
        activeThread.counterpartyLegalName,
      );
    }
    for (const row of groupParticipants) {
      if (row.legalName) {
        map.set(row.companyId, row.legalName);
      }
    }
    return map;
  }, [threads, activeThread, groupParticipants]);

  const filteredThreads = useMemo(() => {
    const query = threadSearch.trim().toLowerCase();
    if (!query) {
      return threads;
    }
    return threads.filter((thread) => {
      const haystack = [
        thread.counterpartyLegalName,
        thread.lastMessagePreview,
        thread.counterpartyCompanyId,
        thread.freightListingId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [threads, threadSearch]);

  const companyUuidFromSearch = useMemo(
    () => parseCompanyUuidCandidate(threadSearch),
    [threadSearch],
  );

  const showChatSearchPanel =
    chatSearchFocused &&
    threadSearch.trim().length > 0 &&
    (companyUuidFromSearch !== null ||
      companySearchHits.length > 0 ||
      serverSearchHits.length > 0);

  async function submitUnifiedChatSearch(): Promise<void> {
    const query = threadSearch.trim();
    if (!query) {
      return;
    }
    const uuid = parseCompanyUuidCandidate(query);
    if (uuid) {
      await openThreadWithCounterparty(uuid);
      return;
    }
    if (serverSearchHits.length === 1) {
      await loadMessages(serverSearchHits[0].threadId);
      setThreadSearch("");
      setChatSearchFocused(false);
      return;
    }
    if (filteredThreads.length === 1) {
      await loadMessages(filteredThreads[0].threadId);
      setThreadSearch("");
      setChatSearchFocused(false);
      return;
    }
    if (filteredThreads.length > 1) {
      setErrorMessage("Listeden bir sohbet seçin veya firma adı yazın.");
      return;
    }
    if (companySearchHits.length === 1) {
      await openThreadWithCounterparty(companySearchHits[0].companyId);
      return;
    }
    if (companySearchHits.length > 1) {
      setErrorMessage("Firmalar listesinden birini seçin.");
      return;
    }
    if (query.length >= 2 && serverSearchHits.length > 0) {
      setErrorMessage("Mesaj sonuçlarından birini seçin.");
      return;
    }
    if (query.length >= 3) {
      setErrorMessage("Eşleşen firma veya sohbet bulunamadı.");
      return;
    }
    setErrorMessage("Aramak için en az 3 karakter yazın (firma adı).");
  }

  useEffect(() => {
    if (!activeThreadId || mode !== "chat") {
      setThreadSummary(null);
      setListingCard(null);
      setOfferTimeline([]);
      setLlmSummary(null);
      return;
    }
    void MessagingApiClient.fetchThreadInsights(accessToken, locale, activeThreadId)
      .then((payload) => {
        setThreadSummary(payload.summary);
        setListingCard(payload.listingCard);
        setOfferTimeline(payload.offerTimeline ?? []);
        setLlmSummary(payload.llmSummary?.text ?? null);
      })
      .catch(() => {
        setThreadSummary(null);
        setListingCard(null);
        setOfferTimeline([]);
        setLlmSummary(null);
      });
  }, [activeThreadId, accessToken, locale, mode]);

  useEffect(() => {
    if (mode !== "chat" || !accessToken) {
      return;
    }
    void MessagingApiClient.fetchQuickReplies(accessToken, locale)
      .then((payload) => setQuickReplies(payload.templates ?? []))
      .catch(() => setQuickReplies([]));
    void MessagingApiClient.fetchColleagues(accessToken, locale)
      .then((payload) => setColleagues(payload.colleagues ?? []))
      .catch(() => setColleagues([]));
  }, [mode, accessToken, locale]);

  useEffect(() => {
    if (
      mode !== "chat" ||
      !accessToken ||
      !activeThreadId ||
      activeThread?.threadKind !== "group"
    ) {
      setGroupParticipants([]);
      return;
    }
    void MessagingApiClient.listThreadParticipants(
      accessToken,
      locale,
      activeThreadId,
    )
      .then((payload) => setGroupParticipants(payload.participants ?? []))
      .catch(() => setGroupParticipants([]));
  }, [mode, accessToken, locale, activeThreadId, activeThread?.threadKind]);

  useEffect(() => {
    const query = threadSearch.trim();
    if (mode !== "chat" || !accessToken || query.length < 2) {
      setServerSearchHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void MessagingApiClient.searchMessages(accessToken, locale, query)
        .then((payload) => setServerSearchHits(payload.results ?? []))
        .catch(() => setServerSearchHits([]));
    }, 320);
    return () => window.clearTimeout(timer);
  }, [threadSearch, mode, accessToken, locale]);

  useEffect(() => {
    const query = threadSearch.trim();
    const uuidCandidate = parseCompanyUuidCandidate(query);
    if (mode !== "chat" || !accessToken || uuidCandidate) {
      setCompanySearchHits([]);
      return;
    }
    if (query.length < 3) {
      setCompanySearchHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void MessagingApiClient.searchCompanies(accessToken, locale, query)
        .then((payload) => setCompanySearchHits(payload.companies ?? []))
        .catch(() => setCompanySearchHits([]));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [threadSearch, mode, accessToken, locale]);

  useEffect(() => {
    const query = groupSearchQuery.trim();
    if (!groupModalOpen || !accessToken || query.length < 3) {
      setGroupSearchHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void MessagingApiClient.searchCompanies(accessToken, locale, query)
        .then((payload) => setGroupSearchHits(payload.companies ?? []))
        .catch(() => setGroupSearchHits([]));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [groupSearchQuery, groupModalOpen, accessToken, locale]);

  async function refreshLlmSummary(): Promise<void> {
    if (!activeThreadId) {
      return;
    }
    setLlmBusy(true);
    try {
      const payload = await MessagingApiClient.fetchThreadInsights(
        accessToken,
        locale,
        activeThreadId,
        true,
      );
      setLlmSummary(payload.llmSummary?.text ?? null);
    } finally {
      setLlmBusy(false);
    }
  }

  useEffect(() => {
    if (mode !== "chat" || !accessToken) {
      return;
    }
    let pollTimer: number | undefined;
    let reconnectTimer: number | undefined;
    let eventSource: EventSource | null = null;
    let closed = false;
    let sseConnected = false;
    let reconnectAttempt = 0;
    const maxReconnectDelayMs = 60_000;
    const pollIntervalMs = 12_000;

    function stopPolling(): void {
      if (pollTimer !== undefined) {
        window.clearInterval(pollTimer);
        pollTimer = undefined;
      }
    }

    function refreshFromServer(): void {
      void loadThreads();
      if (activeThreadId) {
        void loadMessages(activeThreadId);
      }
    }

    function startPolling(): void {
      if (pollTimer !== undefined || sseConnected) {
        return;
      }
      pollTimer = window.setInterval(refreshFromServer, pollIntervalMs);
    }

    function scheduleSseReconnect(): void {
      if (closed || reconnectTimer !== undefined) {
        return;
      }
      const delay = Math.min(
        1000 * 2 ** reconnectAttempt,
        maxReconnectDelayMs,
      );
      reconnectAttempt += 1;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = undefined;
        connectSse();
      }, delay);
    }

    function onSseDown(): void {
      sseConnected = false;
      eventSource?.close();
      eventSource = null;
      startPolling();
      scheduleSseReconnect();
    }

    function connectSse(): void {
      if (closed) {
        return;
      }
      void MessagingApiClient.createStreamTicket(accessToken, locale)
        .then(({ ticket }) => {
          if (closed) {
            return;
          }
          eventSource?.close();
          eventSource = new EventSource(MessagingApiClient.streamUrl(ticket));
          eventSource.onopen = () => {
            sseConnected = true;
            reconnectAttempt = 0;
            stopPolling();
          };
          eventSource.addEventListener("message", (event) => {
            try {
              const data = JSON.parse((event as MessageEvent).data) as {
                type?: string;
                threadId?: string;
              };
              if (data.type === "typing" && data.threadId === activeThreadId) {
                setTypingHint("Karşı taraf yazıyor…");
                window.setTimeout(() => setTypingHint(""), 3000);
                return;
              }
            } catch {
              /* not JSON */
            }
            refreshFromServer();
          });
          eventSource.onerror = () => {
            onSseDown();
          };
        })
        .catch(() => {
          onSseDown();
        });
    }

    connectSse();

    return () => {
      closed = true;
      sseConnected = false;
      eventSource?.close();
      stopPolling();
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, [mode, accessToken, locale, activeThreadId, loadMessages, loadThreads]);

  useEffect(() => {
    if (mode !== "chat" || !accessToken) {
      return;
    }
    void ensureMessagingWebPush(accessToken).catch(() => undefined);
  }, [mode, accessToken]);

  useEffect(() => {
    const companyId = activeThread?.counterpartyCompanyId;
    if (!companyId) {
      setCounterpartyTrust(null);
      return;
    }
    void TrustScoreApiClient.fetchSnapshot(companyId)
      .then((payload) => setCounterpartyTrust(payload.snapshot))
      .catch(() => setCounterpartyTrust(null));
  }, [activeThread?.counterpartyCompanyId]);

  const totalUnread = threads.reduce(
    (sum, thread) => sum + (thread.unreadCount ?? 0),
    0,
  );

  return (
    <ModulePageShell>
      <div className="messaging-mode-bar">
        <div
          className="messaging-mode-tabs"
          role="tablist"
          aria-label="Mesajlar görünümü"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "email"}
            className={
              mode === "email"
                ? "messaging-mode-tab messaging-mode-tab--active"
                : "messaging-mode-tab"
            }
            onClick={() => switchMode("email")}
          >
            Kurumsal e-posta (posta)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "chat"}
            className={
              mode === "chat"
                ? "messaging-mode-tab messaging-mode-tab--active"
                : "messaging-mode-tab"
            }
            onClick={() => switchMode("chat")}
          >
            Firma sohbeti
          </button>
        </div>
        {mode === "email" && !mailEmbedFullscreen ? (
          <button
            type="button"
            className="messaging-mode-action"
            onClick={() => setMailEmbedFullscreen(true)}
            aria-label="Posta görünümünü tam ekran aç"
          >
            <span className="messaging-mode-action-icon" aria-hidden>
              ⛶
            </span>
            Tam ekran
          </button>
        ) : null}
      </div>

      {moduleBlocked ? (
        <p className="module-hint messaging-module-blocked">
          Firma sohbeti modülü bu hesapta kapalı. Abonelik veya paket ayarlarını
          kontrol edin; kurumsal e-posta sekmesi ayrı çalışabilir.
        </p>
      ) : null}

      {errorMessage && !moduleBlocked ? (
        <p className="error banner error--light">{errorMessage}</p>
      ) : null}

      {mode === "chat" && searchParams.get("listingId") ? (
        <p className="module-hint" style={{ marginBottom: "0.75rem" }}>
          Bu sohbet ilan{" "}
          <code>{searchParams.get("listingId")?.slice(0, 8)}…</code> bağlamında
          açılır. Karşı firma ID girip <strong>Aç</strong> kullanın.
        </p>
      ) : null}

      {mode === "email" ? (
        <div
          className={
            mailEmbedFullscreen
              ? "messaging-mail-embed-wrap messaging-mail-embed-wrap--fullscreen"
              : "messaging-mail-embed-wrap"
          }
        >
          {mailEmbedFullscreen ? (
            <div className="messaging-mail-embed-toolbar">
              <button
                type="button"
                className="messaging-mode-action messaging-mode-action--overlay"
                onClick={() => setMailEmbedFullscreen(false)}
              >
                <span className="messaging-mode-action-icon" aria-hidden>
                  ✕
                </span>
                Tam ekrandan çık
              </button>
            </div>
          ) : null}
          <MessagingMailWebEmbed
            composeTo={searchParams.get("composeTo") ?? undefined}
          />
        </div>
      ) : (
        <div
          className={
            mobileThreadOpen && activeThreadId
              ? "chat-layout chat-layout--mobile-thread"
              : "chat-layout"
          }
        >
          <aside className="chat-sidebar module-panel">
            <div className="chat-sidebar-header">
              <div className="chat-sidebar-heading">
                <h2 className="chat-sidebar-title">Sohbetler</h2>
                <p className="chat-sidebar-subtitle">
                  {filteredThreads.length > 0
                    ? `${filteredThreads.length} konuşma`
                    : "Firma mesajları"}
                </p>
              </div>
              <button
                type="button"
                className="chat-sidebar-new-group"
                disabled={isBusy}
                title="Grup sohbet aç"
                onClick={() => {
                  setGroupModalOpen(true);
                  setGroupSearchQuery("");
                  setGroupSearchHits([]);
                }}
              >
                <IconUsers size={16} />
                <span>Grup</span>
              </button>
            </div>
            <div className="chat-unified-search">
              <IconSearch className="chat-unified-search-icon" />
              <input
                className="input-light chat-unified-search-input"
                placeholder="Sohbet veya firma adı ara…"
                value={threadSearch}
                onChange={(event) => setThreadSearch(event.target.value)}
                onFocus={() => setChatSearchFocused(true)}
                onBlur={() => {
                  window.setTimeout(() => setChatSearchFocused(false), 160);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void submitUnifiedChatSearch();
                  }
                  if (event.key === "Escape") {
                    setThreadSearch("");
                    setChatSearchFocused(false);
                  }
                }}
                aria-label="Sohbet ara veya yeni sohbet aç"
                aria-expanded={showChatSearchPanel}
                aria-controls="chat-unified-search-panel"
                role="combobox"
                autoComplete="off"
              />
              {showChatSearchPanel ? (
                <div
                  id="chat-unified-search-panel"
                  className="chat-unified-search-panel"
                  role="listbox"
                >
                  {companyUuidFromSearch ? (
                    <button
                      type="button"
                      className="chat-unified-search-option chat-unified-search-option--new"
                      role="option"
                      disabled={isBusy}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() =>
                        void openThreadWithCounterparty(companyUuidFromSearch)
                      }
                    >
                      <span className="chat-unified-search-option-kicker">
                        Yeni sohbet (UUID)
                      </span>
                      <span className="chat-unified-search-option-title">
                        {shortCompanyId(companyUuidFromSearch)}
                      </span>
                    </button>
                  ) : null}
                  {companySearchHits.length > 0 ? (
                    <div className="chat-unified-search-group">
                      <p className="chat-unified-search-group-label">Firmalar</p>
                      <ul className="chat-unified-search-list">
                        {companySearchHits.slice(0, 8).map((company) => (
                          <li key={company.companyId}>
                            <button
                              type="button"
                              className="chat-unified-search-option chat-unified-search-option--company"
                              role="option"
                              disabled={isBusy}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() =>
                                void openThreadWithCounterparty(
                                  company.companyId,
                                )
                              }
                            >
                              <span className="chat-unified-search-option-title">
                                {company.legalName}
                              </span>
                              <span className="chat-unified-search-option-sub">
                                {participantTypeLabel(
                                  company.participantTypeCode,
                                )}
                                {company.countryCode
                                  ? ` · ${company.countryCode}`
                                  : ""}
                                {company.trustReviewCount > 0
                                  ? ` · Güven ${company.trustScoreValue}`
                                  : ""}
                                {company.hasExistingThread
                                  ? " · Mevcut sohbet"
                                  : " · Yeni sohbet"}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {serverSearchHits.length > 0 ? (
                    <div className="chat-unified-search-group">
                      <p className="chat-unified-search-group-label">
                        Mesajlarda
                      </p>
                      <ul className="chat-unified-search-list">
                        {serverSearchHits.slice(0, 6).map((hit) => (
                          <li key={hit.messageId}>
                            <button
                              type="button"
                              className="chat-unified-search-option"
                              role="option"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => void jumpToSearchHit(hit)}
                            >
                              <span className="chat-unified-search-option-title">
                                {hit.counterpartyLegalName?.trim() ||
                                  shortCompanyId(hit.counterpartyCompanyId)}
                              </span>
                              <span className="chat-unified-search-option-sub">
                                {highlightSearchSnippet(
                                  hit.snippet,
                                  threadSearch.trim(),
                                )}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {filteredThreads.length === 0 ? (
              <EmptyState
                message={
                  threads.length === 0
                    ? "Henüz sohbet yok. Üstte firma adı ile yeni sohbet açın."
                    : "Aramanızla eşleşen sohbet yok."
                }
              />
            ) : (
              <ul className="chat-thread-list">
                {filteredThreads.map((thread) => (
                  <ChatThreadListItem
                    key={thread.threadId}
                    thread={thread}
                    active={activeThreadId === thread.threadId}
                    locale={locale}
                    onSelect={() => {
                      setMobileThreadOpen(true);
                      void loadMessages(thread.threadId);
                    }}
                  />
                ))}
              </ul>
            )}
            {isCompanyOwner && channelSettingsOpen ? (
              <MessagingChannelSettingsPanel
                accessToken={accessToken}
                visible={channelSettingsOpen}
              />
            ) : null}
          </aside>

          <section className="chat-main module-panel">
            <div className="chat-main-header">
              {mobileThreadOpen && activeThreadId ? (
                <button
                  type="button"
                  className="chat-mobile-back"
                  onClick={() => {
                    setMobileThreadOpen(false);
                    setActiveThreadId("");
                  }}
                >
                  ← Sohbetler
                </button>
              ) : null}
              <h2 className="module-panel-title">
                {activeThread
                  ? activeThread.threadKind === "group"
                    ? activeThread.title?.trim() ||
                      activeThread.counterpartyLegalName?.trim() ||
                      "Grup sohbet"
                    : activeThread.counterpartyLegalName?.trim() ||
                      shortCompanyId(activeThread.counterpartyCompanyId)
                  : "Mesaj kutusu"}
              </h2>
              {activeThread?.threadKind === "group" &&
              groupParticipants.length > 0 ? (
                <ul
                  className="chat-group-participants"
                  aria-label="Grup katılımcıları"
                >
                  {groupParticipants.map((row) => (
                    <li key={row.companyId} className="chat-group-participant">
                      <span className="chat-group-participant-name">
                        {row.legalName ?? row.companyId.slice(0, 8)}
                      </span>
                      <span className="chat-group-participant-role">
                        {groupParticipantRoleLabel(row.participantRole)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {activeThreadId &&
            (listingCard ||
              (counterpartyTrust && activeThread?.threadKind !== "group")) ? (
              <div className="chat-context-pin" aria-label="İş bağlamı">
                <button
                  type="button"
                  className="chat-context-pin-toggle"
                  aria-expanded={!contextPinCollapsed}
                  onClick={() => setContextPinCollapsed((value) => !value)}
                >
                  İş bağlamı {contextPinCollapsed ? "▸" : "▾"}
                </button>
                {!contextPinCollapsed ? (
                  <div className="chat-context-pin-body">
                    {listingCard ? (
                      <div className="chat-listing-card chat-listing-card--inline">
                        <p className="chat-listing-card-route">
                          {listingCard.routeLabel}
                        </p>
                        <p className="chat-listing-card-meta">
                          {listingCard.equipmentTypeCode} ·{" "}
                          {listingCard.weightTonnes} t · yükleme{" "}
                          {listingCard.loadingDateStart}
                          {listingCard.priceAmount
                            ? ` · ${listingCard.priceAmount} ${listingCard.priceCurrencyCode}`
                            : ""}
                        </p>
                        {listingCard.priceAmount ? (
                          <button
                            type="button"
                            className="btn-account-primary chat-listing-accept-btn"
                            disabled={acceptOfferBusy || isBusy}
                            onClick={() => void acceptListingFixedPrice()}
                          >
                            {acceptOfferBusy
                              ? "Kabul ediliyor…"
                              : "Sabit fiyatı kabul et"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {counterpartyTrust &&
                    activeThread?.threadKind !== "group" ? (
                      <div className="chat-trust-row">
                        <span
                          className="chat-trust-badge"
                          title="Lerta güven skoru"
                        >
                          Güven {counterpartyTrust.scoreValue.toFixed(1)}
                          {counterpartyTrust.reviewCount > 0
                            ? ` · ${counterpartyTrust.reviewCount} değerlendirme`
                            : ""}
                        </span>
                        <Link
                          className="chat-trust-link"
                          href={`/trust?companyId=${encodeURIComponent(
                            activeThread?.counterpartyCompanyId ?? "",
                          )}`}
                        >
                          Profil
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            {threadSummary ? (
              <aside className="chat-summary-panel" aria-label="Sohbet özet">
                <p className="chat-summary-title">{threadSummary.headline}</p>
                <ul className="chat-summary-list">
                  {threadSummary.bullets.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {offerTimeline.length > 0 ? (
                  <div className="chat-offer-timeline-wrap">
                    <button
                      type="button"
                      className="chat-offer-timeline-toggle"
                      aria-expanded={offerTimelineOpen}
                      onClick={() => setOfferTimelineOpen((open) => !open)}
                    >
                      Teklif geçmişi ({offerTimeline.length})
                    </button>
                    {offerTimelineOpen ? (
                      <ul
                        className="chat-offer-timeline"
                        aria-label="Teklif zaman çizelgesi"
                      >
                        {offerTimeline.map((entry) => (
                          <li key={`${entry.at}-${entry.label}`}>
                            <time dateTime={entry.at}>
                              {new Date(entry.at).toLocaleString(locale, {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </time>
                            <span>
                              {entry.label}
                              {entry.amountText ? ` · ${entry.amountText}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                {llmSummary ? (
                  <p className="chat-llm-summary">{llmSummary}</p>
                ) : null}
                <div className="chat-summary-actions">
                  <button
                    type="button"
                    className="chat-summary-ai-btn"
                    disabled={llmBusy}
                    onClick={() => void refreshLlmSummary()}
                  >
                    <IconSparkles size={17} />
                    <span>
                      {llmBusy ? "AI özet…" : "AI özet (KVKK onaylı)"}
                    </span>
                  </button>
                </div>
                <p className="chat-summary-meta">
                  Yapılandırılmış özet · {threadSummary.messageCount} mesaj
                </p>
              </aside>
            ) : null}
            <div className="chat-messages-toolbar">
              <button
                type="button"
                className={
                  internalNotesOnly
                    ? "chat-internal-filter-btn chat-internal-filter-btn--active"
                    : "chat-internal-filter-btn"
                }
                aria-pressed={internalNotesOnly}
                onClick={() => setInternalNotesOnly((value) => !value)}
              >
                <IconStickyNote size={16} />
                <span>İç notlar</span>
              </button>
            </div>
            <div className="chat-messages">
              {displayedMessages.length === 0 ? (
                <EmptyState
                  message={
                    internalNotesOnly
                      ? "Bu sohbette iç not yok."
                      : "Soldan sohbet seçin veya yeni sohbet açın."
                  }
                />
              ) : (
                <ul className="chat-message-list">
                  {displayedMessages.map((message, messageIndex) => {
                    const isMine =
                      session?.companyId &&
                      message.senderCompanyId === session.companyId;
                    const dayKey = dayKeyFromIso(message.createdAt);
                    const prevDay =
                      messageIndex > 0
                        ? dayKeyFromIso(
                            displayedMessages[messageIndex - 1].createdAt,
                          )
                        : "";
                    const showDay = dayKey !== prevDay;
                    const companyLabel =
                      companyLabelById.get(message.senderCompanyId) ??
                      shortCompanyId(message.senderCompanyId);
                    const bubbleClass = [
                      "chat-bubble",
                      isMine ? "chat-bubble--mine" : "",
                      message.messageKind === "internal"
                        ? "chat-bubble--internal"
                        : "",
                      scrollToMessageId === message.id
                        ? "chat-bubble--highlight"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const readers =
                      message.readByCounterpartyReaders ??
                      (message.readByCounterpartyUserIds ?? []).map(
                        (userId) => ({
                          userId,
                          displayName: userId.slice(0, 8),
                        }),
                      );
                    return (
                      <Fragment key={message.id}>
                        {showDay ? (
                          <li
                            key={`day-${dayKey}`}
                            className="chat-day-separator"
                            aria-hidden
                          >
                            {formatChatDayLabel(message.createdAt, locale)}
                          </li>
                        ) : null}
                        <li
                          key={message.id}
                          id={`chat-msg-${message.id}`}
                          className={bubbleClass}
                        >
                          <div className="chat-bubble-row">
                            <span
                              className={
                                isMine
                                  ? "chat-avatar chat-avatar--mine"
                                  : "chat-avatar"
                              }
                              aria-hidden
                            >
                              {companyInitials(companyLabel)}
                            </span>
                            <div className="chat-bubble-content">
                        <span className="chat-bubble-meta">
                          {isMine ? "Siz" : companyLabel} ·{" "}
                          {new Date(message.createdAt).toLocaleString(locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {isMine ? (
                            <span
                              className={
                                message.readByRecipient
                                  ? "chat-read-ticks chat-read-ticks--read"
                                  : "chat-read-ticks"
                              }
                              title={
                                readers.length > 0
                                  ? `Okuyan: ${readers
                                      .map((row) => row.displayName)
                                      .join(", ")}`
                                  : message.readByRecipient
                                    ? "Karşı firma gördü"
                                    : "Henüz okunmadı"
                              }
                            >
                              {message.readByRecipient ? " ✓✓" : " ✓"}
                            </span>
                          ) : null}
                          {message.messageKind === "internal" ? (
                            <span className="chat-internal-tag"> İç not</span>
                          ) : null}
                          {message.editedAt ? <> · düzenlendi</> : null}
                        </span>
                        <ChatMessageBody
                          text={message.bodyText}
                          mentionNameByUserId={mentionNameByUserId}
                        />
                        {message.operationStamps &&
                        message.operationStamps.length > 0 ? (
                          <ul
                            className="chat-message-stamps"
                            aria-label="İşlem damgaları"
                          >
                            {message.operationStamps.map((stamp) => (
                              <li
                                key={`${stamp.stampedByCompanyId}-${stamp.stampType}-${stamp.createdAt}`}
                                className={`chat-message-stamp chat-message-stamp--${stamp.stampType}`}
                              >
                                {operationStampLabel(stamp.stampType)}
                                <span className="chat-message-stamp-by">
                                  {stamp.stampedByDisplayName}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {message.attachments && message.attachments.length > 0 ? (
                          <ul className="chat-attachment-list">
                            {message.attachments.map((attachment) => (
                              <li key={attachment.index}>
                                <button
                                  type="button"
                                  className="chat-attachment-link"
                                  onClick={async () => {
                                    if (!activeThreadId) {
                                      return;
                                    }
                                    try {
                                      const blob =
                                        await MessagingApiClient.downloadAttachment(
                                          accessToken,
                                          locale,
                                          activeThreadId,
                                          message.id,
                                          attachment.index,
                                        );
                                      const url = URL.createObjectURL(blob);
                                      const anchor = document.createElement("a");
                                      anchor.href = url;
                                      anchor.download = attachment.filename;
                                      anchor.click();
                                      URL.revokeObjectURL(url);
                                    } catch (error) {
                                      setErrorMessage(
                                        error instanceof Error
                                          ? error.message
                                          : "Ek indirilemedi",
                                      );
                                    }
                                  }}
                                >
                                  📎 {attachment.filename} (
                                  {Math.round(attachment.sizeBytes / 1024)} KB)
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {translations[message.id] ? (
                          <p className="chat-translation">
                            {translations[message.id]}
                          </p>
                        ) : null}
                        <ChatMessageActionBar
                          isMine={Boolean(isMine)}
                          deleted={Boolean(message.deleted)}
                          isInternal={message.messageKind === "internal"}
                          translateBusy={translateBusyId === message.id}
                          stampBusy={stampBusyId === message.id}
                          onReply={() =>
                            setQuotedMessage({
                              id: message.id,
                              preview: message.bodyText.slice(0, 240),
                            })
                          }
                          onStamp={(stampType) =>
                            void handleOperationStamp(message.id, stampType)
                          }
                          onTranslate={(target) =>
                            void handleTranslateMessage(message, target)
                          }
                          onEdit={() =>
                            setEditMessage({
                              id: message.id,
                              bodyText: message.bodyText,
                            })
                          }
                          onDelete={() => setDeleteMessageId(message.id)}
                        />
                            </div>
                          </div>
                        </li>
                      </Fragment>
                    );
                  })}
                </ul>
              )}
            </div>
            <div
              className={[
                "chat-compose-dock",
                internalNote ? "chat-compose-dock--internal" : "",
                composeDragActive ? "chat-compose-dock--drag" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onDragOver={(event) => {
                event.preventDefault();
                if (activeThreadId) {
                  setComposeDragActive(true);
                }
              }}
              onDragLeave={() => setComposeDragActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setComposeDragActive(false);
                if (event.dataTransfer.files.length > 0) {
                  void addPendingFiles(event.dataTransfer.files);
                }
              }}
            >
              {quotedMessage ? (
                <div className="chat-quote-preview" role="status">
                  <span className="chat-quote-preview-label">Yanıt</span>
                  <p className="chat-quote-preview-text">
                    {quotedMessage.preview}
                  </p>
                  <button
                    type="button"
                    className="chat-quote-preview-remove"
                    aria-label="Alıntıyı kaldır"
                    onClick={() => setQuotedMessage(null)}
                  >
                    ×
                  </button>
                </div>
              ) : null}
              {internalNote ? (
                <p className="chat-compose-internal-banner" role="status">
                  İç not modu — yalnızca şirketiniz görür, karşı tarafa gitmez.
                </p>
              ) : null}
              {typingHint ? (
                <p className="chat-typing-hint" aria-live="polite">
                  {typingHint}
                </p>
              ) : null}
              {pendingAttachments.length > 0 ? (
                <ul className="chat-pending-attachments">
                  {pendingAttachments.map((file) => (
                    <li key={file.filename} className="chat-pending-chip">
                      {file.previewUrl ? (
                        <img
                          className="chat-pending-thumb"
                          src={file.previewUrl}
                          alt=""
                        />
                      ) : file.contentType.includes("pdf") ? (
                        <span className="chat-pending-pdf" aria-hidden>
                          PDF
                        </span>
                      ) : null}
                      <span className="chat-pending-chip-name" title={file.filename}>
                        📎 {file.filename}
                      </span>
                      <button
                        type="button"
                        className="chat-pending-chip-remove"
                        aria-label={`${file.filename} kaldır`}
                        onClick={() =>
                          setPendingAttachments((current) =>
                            current.filter((row) => row.filename !== file.filename),
                          )
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="chat-compose-toolbar">
                <div
                  className="chat-compose-mode"
                  role="group"
                  aria-label="Mesaj türü"
                >
                  <button
                    type="button"
                    className={
                      internalNote
                        ? "chat-compose-mode-btn"
                        : "chat-compose-mode-btn chat-compose-mode-btn--active"
                    }
                    aria-pressed={!internalNote}
                    disabled={!activeThreadId}
                    title="Karşı firmaya"
                    onClick={() => setInternalNote(false)}
                  >
                    <IconMessageSquare size={16} />
                    <span className="chat-compose-mode-label">Karşı firma</span>
                  </button>
                  <button
                    type="button"
                    className={
                      internalNote
                        ? "chat-compose-mode-btn chat-compose-mode-btn--active chat-compose-mode-btn--internal"
                        : "chat-compose-mode-btn"
                    }
                    aria-pressed={internalNote}
                    disabled={!activeThreadId}
                    title="İç not"
                    onClick={() => setInternalNote(true)}
                  >
                    <IconLockNote size={16} />
                    <span className="chat-compose-mode-label">İç not</span>
                  </button>
                </div>
                <div className="chat-compose-toolbar-actions">
                  {colleagues.length > 0 ? (
                    <div className="chat-mention-anchor">
                      <button
                        type="button"
                        className="chat-compose-tool-btn"
                        disabled={!activeThreadId}
                        aria-expanded={mentionDropdownOpen}
                        aria-haspopup="listbox"
                        title="Ekip etiketle"
                        onClick={() => setMentionMenuOpen((open) => !open)}
                      >
                        <IconUsers size={16} />
                        <span className="sr-only">Ekip etiketle</span>
                      </button>
                      {mentionDropdownOpen ? (
                        <ul
                          className="chat-mention-menu"
                          role="listbox"
                          aria-label="Ekip üyesi etiketle"
                        >
                          {mentionSuggestions.length === 0 ? (
                            <li className="chat-mention-menu-empty">
                              Eşleşen ekip üyesi yok
                            </li>
                          ) : (
                            mentionSuggestions.map((colleague, index) => (
                              <li
                                key={colleague.userId}
                                role="option"
                                aria-selected={index === mentionPickIndex}
                              >
                                <button
                                  type="button"
                                  className={
                                    index === mentionPickIndex
                                      ? "chat-mention-menu-item chat-mention-menu-item--active"
                                      : "chat-mention-menu-item"
                                  }
                                  onMouseDown={(event) =>
                                    event.preventDefault()
                                  }
                                  onClick={() =>
                                    applyColleagueMention(colleague)
                                  }
                                >
                                  <span className="chat-mention-menu-name">
                                    {colleague.displayName}
                                  </span>
                                  <span className="chat-mention-menu-hint">
                                    etiketle
                                  </span>
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                  {isCompanyOwner ? (
                    <>
                      <button
                        type="button"
                        className="chat-compose-tool-btn"
                        disabled={quickReplyAdminBusy}
                        title="Şablon yönet"
                        onClick={() => void openQuickReplyAdmin()}
                      >
                        <IconTemplate size={16} />
                        <span className="sr-only">Şablon yönet</span>
                      </button>
                      <button
                        type="button"
                        className="chat-compose-tool-btn"
                        aria-expanded={channelSettingsOpen}
                        title="Kanallar"
                        onClick={() =>
                          setChannelSettingsOpen((open) => !open)
                        }
                      >
                        <IconChannels size={16} />
                        <span className="sr-only">Kanallar</span>
                      </button>
                    </>
                  ) : null}
                  {quickReplies.length > 0 ? (
                    <label className="chat-compose-template">
                      <span className="sr-only">Hazır şablon</span>
                      <select
                        ref={templateSelectRef}
                        id="chat-quick-reply"
                        className="chat-compose-template-select"
                        defaultValue=""
                        disabled={!activeThreadId}
                        onChange={(event) => {
                          const id = event.target.value;
                          if (!id) {
                            return;
                          }
                          const template = quickReplies.find(
                            (row) => row.id === id,
                          );
                          if (template) {
                            setMessageBody(template.bodyText);
                            messageInputRef.current?.focus();
                          }
                          event.target.value = "";
                        }}
                      >
                        <option value="">Şablon…</option>
                        {quickReplies.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.labelTr}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              </div>
              <div className="chat-compose-editor">
                <label className="chat-compose-attach" title="Dosya ekle (en fazla 5, 10 MB)">
                  <IconPaperclip className="chat-compose-attach-icon" />
                  <span className="sr-only">Dosya ekle</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf,text/plain,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    disabled={!activeThreadId || pendingAttachments.length >= 5}
                    onChange={(event) => {
                      const files = event.target.files;
                      event.target.value = "";
                      if (files && files.length > 0) {
                        void addPendingFiles(files);
                      }
                    }}
                  />
                </label>
                <textarea
                  ref={messageInputRef}
                  className="chat-compose-textarea"
                  placeholder={
                    internalNote
                      ? "Ekip içi notunuzu yazın…"
                      : "Mesajınızı yazın… (@ ile ekip etiketleyin)"
                  }
                  rows={2}
                  value={messageBody}
                  disabled={!activeThreadId}
                  onChange={(event) => {
                    setMessageBody(event.target.value);
                    if (messageHasActiveMentionQuery(event.target.value)) {
                      setMentionMenuOpen(true);
                    }
                    const now = Date.now();
                    if (activeThreadId && now - typingPingRef.current > 2000) {
                      typingPingRef.current = now;
                      void MessagingApiClient.sendTyping(
                        accessToken,
                        locale,
                        activeThreadId,
                      );
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "/" &&
                      !event.shiftKey &&
                      !messageBody.trim() &&
                      quickReplies.length > 0
                    ) {
                      event.preventDefault();
                      templateSelectRef.current?.focus();
                      return;
                    }
                    if (mentionDropdownOpen && mentionSuggestions.length > 0) {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setMentionPickIndex(
                          (current) =>
                            (current + 1) % mentionSuggestions.length,
                        );
                        return;
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setMentionPickIndex(
                          (current) =>
                            (current - 1 + mentionSuggestions.length) %
                            mentionSuggestions.length,
                        );
                        return;
                      }
                      if (event.key === "Enter" && event.shiftKey === false) {
                        const picked = mentionSuggestions[mentionPickIndex];
                        if (picked && messageHasActiveMentionQuery(messageBody)) {
                          event.preventDefault();
                          applyColleagueMention(picked);
                          return;
                        }
                      }
                    }
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSendMessage();
                    }
                    if (event.key === "Escape") {
                      if (mentionDropdownOpen) {
                        setMentionMenuOpen(false);
                      }
                      if (quotedMessage) {
                        setQuotedMessage(null);
                      }
                    }
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setMentionMenuOpen(false), 160);
                  }}
                />
                <button
                  type="button"
                  className="chat-compose-send"
                  disabled={
                    !activeThreadId ||
                    (!messageBody.trim() && pendingAttachments.length === 0)
                  }
                  title="Gönder"
                  aria-label="Gönder"
                  onClick={() => void handleSendMessage()}
                >
                  <IconSend size={18} />
                </button>
              </div>
              <p className="chat-compose-footnote">
                Enter gönder · Shift+Enter yeni satır
                {colleagues.length > 0 ? " · @ mention" : ""}
                {quickReplies.length > 0 ? " · / şablon" : ""}
                {" · Esc iptal"}
              </p>
            </div>
          </section>
          <ChatStatsRail
            threadCount={threads.length}
            totalUnread={totalUnread}
            activeMessageCount={messages.length}
            isCompanyOwner={isCompanyOwner}
            onExportKvkk={() => void handleExportArchive()}
          />
        </div>
      )}
      <ChatMessageEditModal
        open={editMessage !== null}
        bodyText={editMessage?.bodyText ?? ""}
        busy={messageActionBusy}
        onBodyChange={(value) =>
          setEditMessage((current) =>
            current ? { ...current, bodyText: value } : current,
          )
        }
        onCancel={() => setEditMessage(null)}
        onSave={() => void saveEditedMessage()}
      />
      <ChatMessageDeleteModal
        open={deleteMessageId !== null}
        busy={messageActionBusy}
        onCancel={() => setDeleteMessageId(null)}
        onConfirm={() => void confirmDeleteMessage()}
      />
      <ChatGroupThreadModal
        open={groupModalOpen}
        busy={isBusy}
        title={groupTitle}
        searchQuery={groupSearchQuery}
        searchHits={groupSearchHits}
        selected={groupSelected}
        onClose={() => {
          setGroupModalOpen(false);
          setGroupSelected([]);
          setGroupSearchQuery("");
        }}
        onTitleChange={setGroupTitle}
        onSearchChange={setGroupSearchQuery}
        onAddCompany={(company) => {
          setGroupSelected((current) => {
            if (current.some((row) => row.companyId === company.companyId)) {
              return current;
            }
            return [...current, company].slice(0, 8);
          });
        }}
        onRemoveCompany={(companyId) =>
          setGroupSelected((current) =>
            current.filter((row) => row.companyId !== companyId),
          )
        }
        onCreate={() => void createGroupThread()}
      />
      <ChatQuickReplyAdminModal
        open={quickReplyAdminOpen}
        busy={quickReplyAdminBusy}
        templates={orgQuickReplyDrafts}
        onClose={() => setQuickReplyAdminOpen(false)}
        onChange={setOrgQuickReplyDrafts}
        onSave={() => void saveOrgQuickReplies()}
      />
    </ModulePageShell>
  );
}
