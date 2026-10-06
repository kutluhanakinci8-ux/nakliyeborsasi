"use client";

import { IconSearch, IconUsers } from "./ChatUiIcons";
import { ChatThreadListItem } from "./ChatThreadListItem";
import { MessagingChannelSettingsPanel } from "./MessagingChannelSettingsPanel";
import { EmptyState } from "../EmptyState";
import { highlightSearchSnippet } from "../../lib/messagingChatUi";
import {
  participantTypeLabel,
  shortCompanyId,
} from "../../lib/messagingPageHelpers";
import type { MessagingChatController } from "../../hooks/useMessagingChatController";
import { MessagingRealtimeStatusBadge } from "./MessagingRealtimeStatusBadge";

type Props = {
  chat: MessagingChatController;
  locale: string;
  accessToken: string;
};

export function MessagingThreadSidebar({ chat, locale, accessToken }: Props) {
  const {
    filteredThreads,
    threads,
    threadSearch,
    setThreadSearch,
    chatSearchFocused,
    setChatSearchFocused,
    isBusy,
    companyUuidFromSearch,
    showChatSearchPanel,
    companySearchHits,
    serverSearchHits,
    openThreadWithCounterparty,
    jumpToSearchHit,
    submitUnifiedChatSearch,
    activeThreadId,
    loadMessages,
    setMobileThreadOpen,
    isCompanyOwner,
    channelSettingsOpen,
    setGroupModalOpen,
    setGroupSearchQuery,
    setGroupSearchHits,
    realtimeTransport,
  } = chat;
  return (
          <aside
            className="chat-sidebar module-panel"
            aria-label="Sohbet listesi"
          >
            <div className="chat-sidebar-header">
              <div className="chat-sidebar-heading">
                <h2 className="chat-sidebar-title">Sohbetler</h2>
                <p className="chat-sidebar-subtitle">
                  {filteredThreads.length > 0
                    ? `${filteredThreads.length} konuşma`
                    : "Firma mesajları"}
                </p>
                <MessagingRealtimeStatusBadge
                  transport={realtimeTransport}
                  className="chat-sidebar-realtime"
                />
              </div>
              <button
                type="button"
                className="chat-sidebar-new-group"
                disabled={isBusy}
                title="Grup sohbet aç"
                aria-label="Yeni grup sohbeti aç"
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
              <ul className="chat-thread-list" aria-label="Konuşmalar">
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
  );
}
