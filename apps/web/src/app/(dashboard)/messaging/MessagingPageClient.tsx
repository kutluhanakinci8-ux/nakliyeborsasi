"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MessagingMailWebEmbed } from "../../../components/messaging/MessagingMailWebEmbed";
import { EmptyState } from "../../../components/EmptyState";
import { ModulePageShell } from "../../../components/ModulePageShell";
import { useWebSession } from "../../../context/WebSessionProvider";
import {
  MessagingApiClient,
  MessagingThreadRecord,
  MessagingThreadSummaryRecord,
  ThreadMessageRecord,
} from "../../../lib/MessagingApiClient";
import {
  TrustScoreApiClient,
  TrustScoreRecord,
} from "../../../lib/TrustScoreApiClient";
import { ensureMessagingWebPush } from "../../../lib/messagingPush";

type PendingAttachment = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

async function readFileAsAttachment(file: File): Promise<PendingAttachment> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    contentBase64: btoa(binary),
  };
}

type MessagingMode = "chat" | "email";

function shortCompanyId(companyId: string): string {
  if (companyId.length <= 12) {
    return companyId;
  }
  return `${companyId.slice(0, 8)}…${companyId.slice(-4)}`;
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
  const [counterpartyId, setCounterpartyId] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messages, setMessages] = useState<ThreadMessageRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [mailEmbedFullscreen, setMailEmbedFullscreen] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");
  const [counterpartyTrust, setCounterpartyTrust] =
    useState<TrustScoreRecord | null>(null);
  const [moduleBlocked, setModuleBlocked] = useState(false);
  const [threadSummary, setThreadSummary] =
    useState<MessagingThreadSummaryRecord | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([]);
  const [translateBusyId, setTranslateBusyId] = useState("");
  const deepLinkHandledKey = useRef<string | null>(null);
  const isCompanyOwner =
    session?.roleCodes?.includes("COMPANY_OWNER") ?? false;

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
      router.replace("/messaging?tab=email", { scroll: false });
    }
    const rawEmail = searchParams.get("email")?.trim();
    if (rawEmail && !searchParams.get("composeTo")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "email");
      params.set("composeTo", rawEmail);
      params.delete("email");
      router.replace(`/messaging?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, router]);

  function switchMode(next: MessagingMode): void {
    setMode(next);
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

  async function loadThreads(): Promise<void> {
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
  }

  useEffect(() => {
    if (mode === "chat") {
      void loadThreads();
    }
  }, [accessToken, locale, mode]);

  async function handleOpenThread(): Promise<void> {
    if (!counterpartyId.trim()) {
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
        counterpartyId.trim(),
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
      await loadThreads();
      await loadMessages(threadId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sohbet hatası");
    } finally {
      setIsBusy(false);
    }
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
      setCounterpartyId(companyId);
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

  async function handleTranslateMessage(message: ThreadMessageRecord): Promise<void> {
    setTranslateBusyId(message.id);
    try {
      const target = locale.startsWith("tr") ? "en" : "tr";
      const result = await MessagingApiClient.translateMessage(
        accessToken,
        locale,
        message.bodyText,
        target,
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
      await MessagingApiClient.sendMessage(
        accessToken,
        locale,
        activeThreadId,
        messageBody.trim(),
        pendingAttachments.length > 0 ? pendingAttachments : undefined,
      );
      setMessageBody("");
      setPendingAttachments([]);
      await loadMessages(activeThreadId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gönderim hatası");
    }
  }

  const activeThread = threads.find((t) => t.threadId === activeThreadId);

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

  useEffect(() => {
    if (!activeThreadId || mode !== "chat") {
      setThreadSummary(null);
      return;
    }
    void MessagingApiClient.fetchThreadSummary(accessToken, locale, activeThreadId)
      .then((payload) => setThreadSummary(payload.summary))
      .catch(() => setThreadSummary(null));
  }, [activeThreadId, accessToken, locale, mode]);

  useEffect(() => {
    if (mode !== "chat" || !activeThreadId) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadMessages(activeThreadId);
    }, 12_000);
    return () => window.clearInterval(timer);
  }, [mode, activeThreadId, loadMessages]);

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
    <ModulePageShell
      eyebrow={mode === "chat" ? "Mesajlar" : undefined}
      title={mode === "chat" ? "Firma mesajlaşması" : undefined}
      lead={
        mode === "chat"
          ? "Taşıyıcı ve yük veren firmalar arasında güvenli sohbet. Kurumsal Lerta Post kutusu için üstte «Kurumsal e-posta» sekmesine geçin."
          : undefined
      }
      stats={
        mode === "chat"
          ? [
              { value: String(threads.length), label: "Aktif sohbet" },
              {
                value: String(totalUnread),
                label: "Okunmamış",
                highlight: totalUnread > 0,
              },
              { value: String(messages.length), label: "Bu sohbette mesaj" },
              { value: "JWT", label: "Oturum koruması", highlight: true },
            ]
          : undefined
      }
    >
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
        <div className="chat-layout">
          <aside className="chat-sidebar module-panel">
            <h2 className="module-panel-title">Sohbetler</h2>
            <input
              className="input-light chat-thread-search"
              placeholder="Firma veya mesaj ara…"
              value={threadSearch}
              onChange={(event) => setThreadSearch(event.target.value)}
              aria-label="Sohbet ara"
            />
            {isCompanyOwner ? (
              <button
                type="button"
                className="btn-account-secondary chat-export-btn"
                onClick={() => void handleExportArchive()}
              >
                KVKK dışa aktar (JSON)
              </button>
            ) : null}
            <div className="chat-compose-row">
              <input
                className="input-light"
                placeholder="Karşı firma ID"
                value={counterpartyId}
                onChange={(event) => setCounterpartyId(event.target.value)}
              />
              <button
                type="button"
                className="btn-accent"
                disabled={isBusy}
                onClick={() => void handleOpenThread()}
              >
                Aç
              </button>
            </div>
            {filteredThreads.length === 0 ? (
              <EmptyState
                message={
                  threads.length === 0
                    ? "Henüz sohbet yok. Firma ID ile yeni sohbet açın."
                    : "Aramanızla eşleşen sohbet yok."
                }
              />
            ) : (
              <ul className="chat-thread-list">
                {filteredThreads.map((thread) => (
                  <li key={thread.threadId}>
                    <button
                      type="button"
                      className={
                        activeThreadId === thread.threadId
                          ? "chat-thread-item active"
                          : "chat-thread-item"
                      }
                      onClick={() => void loadMessages(thread.threadId)}
                    >
                      <span className="chat-thread-title">
                        {thread.counterpartyLegalName?.trim() ||
                          shortCompanyId(thread.counterpartyCompanyId)}
                        {(thread.unreadCount ?? 0) > 0 ? (
                          <span className="chat-unread-badge">
                            {thread.unreadCount}
                          </span>
                        ) : null}
                      </span>
                      <span className="chat-thread-sub">
                        {thread.lastMessagePreview
                          ? thread.lastMessagePreview
                          : thread.freightListingId
                            ? `İlan ${thread.freightListingId.slice(0, 8)}…`
                            : "Firma sohbeti"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="chat-main module-panel">
            <div className="chat-main-header">
              <h2 className="module-panel-title">
                {activeThread
                  ? activeThread.counterpartyLegalName?.trim() ||
                    shortCompanyId(activeThread.counterpartyCompanyId)
                  : "Mesaj kutusu"}
              </h2>
              {activeThread && counterpartyTrust ? (
                <div className="chat-trust-row">
                  <span className="chat-trust-badge" title="Lerta güven skoru">
                    Güven {counterpartyTrust.scoreValue.toFixed(1)}
                    {counterpartyTrust.reviewCount > 0
                      ? ` · ${counterpartyTrust.reviewCount} değerlendirme`
                      : ""}
                  </span>
                  <Link
                    className="chat-trust-link"
                    href={`/trust?companyId=${encodeURIComponent(
                      activeThread.counterpartyCompanyId,
                    )}`}
                  >
                    Profil
                  </Link>
                </div>
              ) : null}
            </div>
            {threadSummary ? (
              <aside className="chat-summary-panel" aria-label="Sohbet özet">
                <p className="chat-summary-title">{threadSummary.headline}</p>
                <ul className="chat-summary-list">
                  {threadSummary.bullets.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="chat-summary-meta">
                  Yapılandırılmış özet · {threadSummary.messageCount} mesaj
                </p>
              </aside>
            ) : null}
            <div className="chat-messages">
              {messages.length === 0 ? (
                <EmptyState message="Soldan sohbet seçin veya yeni sohbet açın." />
              ) : (
                <ul className="chat-message-list">
                  {messages.map((message) => {
                    const isMine =
                      session?.companyId &&
                      message.senderCompanyId === session.companyId;
                    return (
                      <li
                        key={message.id}
                        className={isMine ? "chat-bubble chat-bubble--mine" : "chat-bubble"}
                      >
                        <span className="chat-bubble-meta">
                          {shortCompanyId(message.senderCompanyId)} ·{" "}
                          {new Date(message.createdAt).toLocaleString(locale)}
                          {isMine && message.readByRecipient ? (
                            <> · Okundu</>
                          ) : null}
                        </span>
                        <p>{message.bodyText}</p>
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
                        <button
                          type="button"
                          className="chat-translate-btn"
                          disabled={translateBusyId === message.id}
                          onClick={() => {
                            if (translations[message.id]) {
                              setTranslations((current) => {
                                const next = { ...current };
                                delete next[message.id];
                                return next;
                              });
                              return;
                            }
                            void handleTranslateMessage(message);
                          }}
                        >
                          {translations[message.id]
                            ? "Çeviriyi gizle"
                            : locale.startsWith("tr")
                              ? "İngilizce çevir"
                              : "Türkçe çevir"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {pendingAttachments.length > 0 ? (
              <ul className="chat-pending-attachments">
                {pendingAttachments.map((file) => (
                  <li key={file.filename}>
                    {file.filename}
                    <button
                      type="button"
                      className="chat-attachment-remove"
                      onClick={() =>
                        setPendingAttachments((current) =>
                          current.filter((row) => row.filename !== file.filename),
                        )
                      }
                    >
                      Kaldır
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="chat-input-row">
              <label className="chat-file-picker">
                <span className="btn-secondary">Dosya</span>
                <input
                  type="file"
                  accept="image/*,application/pdf,text/plain"
                  disabled={!activeThreadId || pendingAttachments.length >= 2}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) {
                      return;
                    }
                    void readFileAsAttachment(file)
                      .then((attachment) => {
                        setPendingAttachments((current) => [
                          ...current.slice(0, 1),
                          attachment,
                        ]);
                      })
                      .catch(() =>
                        setErrorMessage("Dosya okunamadı (en fazla 2,5 MB)."),
                      );
                  }}
                />
              </label>
              <input
                className="input-light"
                placeholder="Mesajınızı yazın…"
                value={messageBody}
                disabled={!activeThreadId}
                onChange={(event) => setMessageBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleSendMessage();
                  }
                }}
              />
              <button
                type="button"
                className="btn-accent"
                disabled={
                  !activeThreadId ||
                  (!messageBody.trim() && pendingAttachments.length === 0)
                }
                onClick={() => void handleSendMessage()}
              >
                Gönder
              </button>
            </div>
          </section>
        </div>
      )}
    </ModulePageShell>
  );
}
