"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessagingMailWebEmbed } from "../../../components/messaging/MessagingMailWebEmbed";
import { EmptyState } from "../../../components/EmptyState";
import { ModulePageShell } from "../../../components/ModulePageShell";
import { useWebSession } from "../../../context/WebSessionProvider";
import {
  MessagingApiClient,
  MessagingThreadRecord,
  ThreadMessageRecord,
} from "../../../lib/MessagingApiClient";

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

  useEffect(() => {
    const companyId = searchParams.get("companyId");
    if (companyId) {
      setCounterpartyId(companyId);
    }
    const threadId = searchParams.get("threadId");
    if (threadId) {
      void loadMessages(threadId);
    }
  }, [searchParams]);

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
      setErrorMessage(error instanceof Error ? error.message : "Yükleme hatası");
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

  async function loadMessages(threadId: string): Promise<void> {
    setActiveThreadId(threadId);
    try {
      const payload = await MessagingApiClient.listMessages(
        accessToken,
        locale,
        threadId,
      );
      setMessages(payload.messages ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Mesaj hatası");
    }
  }

  async function handleSendMessage(): Promise<void> {
    if (!activeThreadId || !messageBody.trim()) {
      return;
    }
    try {
      await MessagingApiClient.sendMessage(
        accessToken,
        locale,
        activeThreadId,
        messageBody.trim(),
      );
      setMessageBody("");
      await loadMessages(activeThreadId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gönderim hatası");
    }
  }

  const activeThread = threads.find((t) => t.threadId === activeThreadId);

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
              { value: String(messages.length), label: "Bu sohbette mesaj" },
              { value: "JWT", label: "Oturum koruması", highlight: true },
            ]
          : undefined
      }
    >
      <div
        className="account-verify-badges messaging-mode-tabs"
        style={{ marginBottom: "1rem" }}
        role="tablist"
        aria-label="Mesajlar görünümü"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "email"}
          className={
            mode === "email"
              ? "account-status-pill account-status-pill--ok"
              : "account-status-pill account-status-pill--pending"
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
              ? "account-status-pill account-status-pill--ok"
              : "account-status-pill account-status-pill--pending"
          }
          onClick={() => switchMode("chat")}
        >
          Firma sohbeti
        </button>
      </div>

      {errorMessage ? <p className="error banner error--light">{errorMessage}</p> : null}

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
          <div className="messaging-mail-embed-toolbar">
            <button
              type="button"
              className="btn-account-secondary"
              onClick={() => setMailEmbedFullscreen((value) => !value)}
            >
              {mailEmbedFullscreen ? "Tam ekrandan çık" : "Tam ekran"}
            </button>
          </div>
          <MessagingMailWebEmbed
            composeTo={searchParams.get("composeTo") ?? undefined}
          />
        </div>
      ) : (
        <div className="chat-layout">
          <aside className="chat-sidebar module-panel">
            <h2 className="module-panel-title">Sohbetler</h2>
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
            {threads.length === 0 ? (
              <EmptyState message="Henüz sohbet yok. Firma ID ile yeni sohbet açın." />
            ) : (
              <ul className="chat-thread-list">
                {threads.map((thread) => (
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
            <h2 className="module-panel-title">
              {activeThread
                ? activeThread.counterpartyLegalName?.trim() ||
                  shortCompanyId(activeThread.counterpartyCompanyId)
                : "Mesaj kutusu"}
            </h2>
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
                        </span>
                        <p>{message.bodyText}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="chat-input-row">
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
                disabled={!activeThreadId || !messageBody.trim()}
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
