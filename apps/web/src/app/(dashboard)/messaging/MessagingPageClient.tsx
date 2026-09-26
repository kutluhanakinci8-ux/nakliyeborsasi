"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OrganizationMailInboxPanel } from "../../../components/account/OrganizationMailInboxPanel";
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

function parseMode(raw: string | null): MessagingMode {
  if (raw === "email" || raw === "posta" || raw === "mail") {
    return "email";
  }
  return "chat";
}

export function MessagingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, locale, session } = useWebSession();
  const [mode, setMode] = useState<MessagingMode>(() =>
    parseMode(searchParams.get("tab")),
  );
  const [threads, setThreads] = useState<MessagingThreadRecord[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messages, setMessages] = useState<ThreadMessageRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setMode(parseMode(searchParams.get("tab")));
  }, [searchParams]);

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
      params.delete("tab");
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

  const pageTitle =
    mode === "email" ? "Kurumsal e-posta" : "Firma mesajlaşması";
  const pageLead =
    mode === "email"
      ? "Lerta Post kurumsal kutunuz — gelen ve giden posta, aynı oturumda. Adresleriniz *.post.lerta.com.tr uzantılı teknik formatta görünür."
      : "Taşıyıcı ve yük veren firmalar arasında güvenli sohbet. Kurumsal Lerta Post kutusu için üstte «Kurumsal e-posta» sekmesine geçin.";

  return (
    <ModulePageShell
      eyebrow="Mesajlar"
      title={pageTitle}
      lead={pageLead}
      stats={
        mode === "chat"
          ? [
              { value: String(threads.length), label: "Aktif sohbet" },
              { value: String(messages.length), label: "Bu sohbette mesaj" },
              { value: "Şifreli", label: "Oturum koruması", highlight: true },
            ]
          : [
              { value: "Lerta Post", label: "Kurumsal kutu", highlight: true },
              { value: session?.companyId ? shortCompanyId(session.companyId) : "—", label: "Firma" },
              { value: "SSO", label: "posta.lerta.com.tr" },
            ]
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
          Kurumsal e-posta
        </button>
      </div>

      {errorMessage ? <p className="error banner error--light">{errorMessage}</p> : null}

      {mode === "email" ? (
        <>
          <MessagingMailWebEmbed />
          <details className="module-panel messaging-mail-panel" style={{ marginTop: "1rem" }}>
            <summary className="module-panel-title" style={{ cursor: "pointer" }}>
              Hızlı gelen kutusu (uygulama içi)
            </summary>
            <OrganizationMailInboxPanel
              variant="messaging"
              primaryAddressDisplay="technical"
            />
          </details>
        </>
      ) : (
        <>
          <p className="messaging-email-hint">
            <strong>Kurumsal e-posta</strong> (Lerta Post,{" "}
            <code>*.post.lerta.com.tr</code>) bu sayfada — yeşil{" "}
            <button
              type="button"
              className="btn-accent"
              style={{ display: "inline", padding: "0.2rem 0.6rem", marginLeft: "0.25rem" }}
              onClick={() => switchMode("email")}
            >
              Kurumsal e-posta
            </button>{" "}
            sekmesine tıklayın veya{" "}
            <a href="/messaging?tab=email">/messaging?tab=email</a> adresini açın.
          </p>
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
        </>
      )}
    </ModulePageShell>
  );
}
