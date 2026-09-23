"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "../../../components/EmptyState";
import { ModulePageShell } from "../../../components/ModulePageShell";
import { useWebSession } from "../../../context/WebSessionProvider";
import {
  MessagingApiClient,
  MessagingThreadRecord,
  ThreadMessageRecord,
} from "../../../lib/MessagingApiClient";

function shortCompanyId(companyId: string): string {
  if (companyId.length <= 12) {
    return companyId;
  }
  return `${companyId.slice(0, 8)}…${companyId.slice(-4)}`;
}

export function MessagingPageClient() {
  const searchParams = useSearchParams();
  const { accessToken, locale, session } = useWebSession();
  const [threads, setThreads] = useState<MessagingThreadRecord[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messages, setMessages] = useState<ThreadMessageRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

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

  async function loadThreads(): Promise<void> {
    try {
      const payload = await MessagingApiClient.listThreads(accessToken, locale);
      setThreads(payload.threads ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Yükleme hatası");
    }
  }

  useEffect(() => {
    void loadThreads();
  }, [accessToken, locale]);

  async function handleOpenThread(): Promise<void> {
    if (!counterpartyId.trim()) {
      setErrorMessage("Karşı firma kimliği girin.");
      return;
    }
    setIsBusy(true);
    setErrorMessage("");
    try {
      const payload = await MessagingApiClient.openThread(
        accessToken,
        locale,
        counterpartyId.trim(),
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
      eyebrow="Mesajlar"
      title="Firma mesajlaşması"
      lead="Taşıyıcı ve yük veren firmalar arasında güvenli sohbet. Marketplace’te «Mesaj» ile sohbet başlatın."
      stats={[
        { value: String(threads.length), label: "Aktif sohbet" },
        { value: String(messages.length), label: "Bu sohbette mesaj" },
        { value: "Şifreli", label: "Oturum koruması", highlight: true },
      ]}
    >
      {errorMessage ? <p className="error banner error--light">{errorMessage}</p> : null}

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
                      {shortCompanyId(thread.counterpartyCompanyId)}
                    </span>
                    <span className="chat-thread-sub">Firma sohbeti</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="chat-main module-panel">
          <h2 className="module-panel-title">
            {activeThread
              ? shortCompanyId(activeThread.counterpartyCompanyId)
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
    </ModulePageShell>
  );
}
