"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "../../../components/EmptyState";
import { PageHeader } from "../../../components/PageHeader";
import { useWebSession } from "../../../context/WebSessionProvider";
import {
  MessagingApiClient,
  MessagingThreadRecord,
  ThreadMessageRecord,
} from "../../../lib/MessagingApiClient";

export function MessagingPageClient() {
  const searchParams = useSearchParams();
  const { accessToken, locale } = useWebSession();
  const [threads, setThreads] = useState<MessagingThreadRecord[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messages, setMessages] = useState<ThreadMessageRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const companyId = searchParams.get("companyId");
    if (companyId) {
      setCounterpartyId(companyId);
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
      return;
    }
    try {
      const payload = await MessagingApiClient.openThread(
        accessToken,
        locale,
        counterpartyId.trim(),
      );
      setActiveThreadId(payload.thread.id);
      await loadThreads();
      await loadMessages(payload.thread.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sohbet hatası");
    }
  }

  async function loadMessages(threadId: string): Promise<void> {
    setActiveThreadId(threadId);
    const payload = await MessagingApiClient.listMessages(
      accessToken,
      locale,
      threadId,
    );
    setMessages(payload.messages ?? []);
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

  return (
    <>
      <PageHeader
        title="Mesajlar"
        description="Taşıyıcılar arası güvenli iletişim"
      />
      {errorMessage ? <p className="error banner">{errorMessage}</p> : null}
      <div className="split-layout">
        <section className="panel-card">
          <h2 className="section-title">Sohbetler</h2>
          <label>
            Karşı firma ID
            <input
              value={counterpartyId}
              onChange={(event) => setCounterpartyId(event.target.value)}
            />
          </label>
          <button type="button" className="btn-primary" onClick={() => void handleOpenThread()}>
            Sohbet aç
          </button>
          {threads.length === 0 ? (
            <EmptyState message="Henüz sohbet yok." />
          ) : (
            <ul className="thread-list">
              {threads.map((thread) => (
                <li key={thread.threadId}>
                  <button
                    type="button"
                    className={
                      activeThreadId === thread.threadId
                        ? "thread-item active"
                        : "thread-item"
                    }
                    onClick={() => void loadMessages(thread.threadId)}
                  >
                    {thread.counterpartyCompanyId.slice(0, 10)}…
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel-card">
          <h2 className="section-title">Mesajlar</h2>
          {messages.length === 0 ? (
            <EmptyState message="Sohbet seçin veya yeni sohbet açın." />
          ) : (
            <ul className="message-list">
              {messages.map((message) => (
                <li key={message.id}>
                  <span className="muted">{message.senderCompanyId.slice(0, 8)}…</span>
                  <p>{message.bodyText}</p>
                </li>
              ))}
            </ul>
          )}
          <label>
            Yeni mesaj
            <input
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
            />
          </label>
          <button type="button" className="btn-primary" onClick={() => void handleSendMessage()}>
            Gönder
          </button>
        </section>
      </div>
    </>
  );
}
