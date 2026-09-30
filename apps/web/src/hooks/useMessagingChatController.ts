"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
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
} from "../lib/MessagingApiClient";
import {
  TrustScoreApiClient,
  TrustScoreRecord,
} from "../lib/TrustScoreApiClient";
import { ensureMessagingWebPush } from "../lib/messagingPush";
import {
  readFileAsAttachment,
  messageHasActiveMentionQuery,
  parseCompanyUuidCandidate,
  type MessagingMode,
  type PendingAttachment,
} from "../lib/messagingPageHelpers";
import type { MessagingOperationStampType } from "../lib/messagingChatUi";
import type { AuthSessionRecord } from "../lib/SessionApiClient";

export type MessagingChatController = ReturnType<typeof useMessagingChatController>;

type Params = {
  accessToken: string;
  locale: string;
  session: AuthSessionRecord | null;
  searchParams: ReadonlyURLSearchParams;
  router: AppRouterInstance;
  mode: MessagingMode;
};

export function useMessagingChatController({
  accessToken,
  locale,
  session,
  searchParams,
  router,
  mode,
}: Params) {
  const [threads, setThreads] = useState<MessagingThreadRecord[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messages, setMessages] = useState<ThreadMessageRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [acceptOfferBusy, setAcceptOfferBusy] = useState(false);
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

  const clearThreadUnreadLocally = useCallback((threadId: string): void => {
    setThreads((current) =>
      current.map((row) =>
        row.threadId === threadId ? { ...row, unreadCount: 0 } : row,
      ),
    );
  }, []);

  const loadMessages = useCallback(
    async (threadId: string): Promise<void> => {
      setActiveThreadId(threadId);
      clearThreadUnreadLocally(threadId);
      try {
        const payload = await MessagingApiClient.listMessages(
          accessToken,
          locale,
          threadId,
        );
        setMessages(payload.messages ?? []);
        await loadThreads();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("lerta-messaging-inbox-changed"));
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Mesaj hatası");
      }
    },
    [accessToken, locale, loadThreads, clearThreadUnreadLocally],
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
    const draft = searchParams.get("draft")?.trim();
    if (!draft) {
      return;
    }
    setMessageBody(draft);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("draft");
    router.replace(`/messaging?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

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

    async function refreshFromServer(): Promise<void> {
      if (activeThreadId) {
        await loadMessages(activeThreadId);
        return;
      }
      await loadThreads();
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
  return {
    threads,
    activeThreadId,
    setActiveThreadId,
    messages,
    errorMessage,
    setErrorMessage,
    isBusy,
    acceptOfferBusy,
    threadSearch,
    setThreadSearch,
    chatSearchFocused,
    setChatSearchFocused,
    counterpartyTrust,
    moduleBlocked,
    threadSummary,
    listingCard,
    offerTimeline,
    offerTimelineOpen,
    setOfferTimelineOpen,
    llmSummary,
    llmBusy,
    serverSearchHits,
    companySearchHits,
    quickReplies,
    internalNote,
    setInternalNote,
    typingHint,
    colleagues,
    internalNotesOnly,
    setInternalNotesOnly,
    editMessage,
    setEditMessage,
    deleteMessageId,
    setDeleteMessageId,
    messageActionBusy,
    groupModalOpen,
    setGroupModalOpen,
    groupTitle,
    setGroupTitle,
    groupSearchQuery,
    setGroupSearchQuery,
    groupSearchHits,
    setGroupSearchHits,
    groupSelected,
    setGroupSelected,
    scrollToMessageId,
    contextPinCollapsed,
    setContextPinCollapsed,
    quotedMessage,
    setQuotedMessage,
    composeDragActive,
    setComposeDragActive,
    mobileThreadOpen,
    setMobileThreadOpen,
    translations,
    pendingAttachments,
    setPendingAttachments,
    translateBusyId,
    stampBusyId,
    quickReplyAdminOpen,
    setQuickReplyAdminOpen,
    orgQuickReplyDrafts,
    setOrgQuickReplyDrafts,
    quickReplyAdminBusy,
    channelSettingsOpen,
    setChannelSettingsOpen,
    groupParticipants,
    messageBody,
    setMessageBody,
    messageInputRef,
    templateSelectRef,
    mentionDropdownOpen,
    mentionSuggestions,
    mentionPickIndex,
    setMentionMenuOpen,
    setMentionPickIndex,
    typingPingRef,
    applyColleagueMention,
    isCompanyOwner,
    mentionNameByUserId,
    displayedMessages,
    activeThread,
    companyLabelById,
    filteredThreads,
    companyUuidFromSearch,
    showChatSearchPanel,
    totalUnread,
    loadMessages,
    loadThreads,
    openThreadWithCounterparty,
    createGroupThread,
    saveEditedMessage,
    confirmDeleteMessage,
    addPendingFiles,
    handleOperationStamp,
    openQuickReplyAdmin,
    saveOrgQuickReplies,
    jumpToSearchHit,
    handleExportArchive,
    handleTranslateMessage,
    handleSendMessage,
    acceptListingFixedPrice,
    submitUnifiedChatSearch,
    refreshLlmSummary,
  };
}
