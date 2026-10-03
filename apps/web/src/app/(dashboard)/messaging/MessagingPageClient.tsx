"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MessagingMailWebEmbed } from "../../../components/messaging/MessagingMailWebEmbed";
import { OrganizationMailInboxPanel } from "../../../components/account/OrganizationMailInboxPanel";
import { MessagingSideRail } from "../../../components/messaging/MessagingSideRail";
import { MessagingThreadSidebar } from "../../../components/messaging/MessagingThreadSidebar";
import { MessagingConversationPanel } from "../../../components/messaging/MessagingConversationPanel";
import {
  ChatGroupThreadModal,
  ChatMessageDeleteModal,
  ChatMessageEditModal,
  ChatQuickReplyAdminModal,
} from "../../../components/messaging/ChatMessagingModals";
import { ModulePageShell } from "../../../components/ModulePageShell";
import { useWebSession } from "../../../context/WebSessionProvider";
import { useMessagingChatController } from "../../../hooks/useMessagingChatController";
import { useMessagingPageRoute } from "../../../hooks/useMessagingPageRoute";

export function MessagingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, locale, session } = useWebSession();

  const route = useMessagingPageRoute({
    accessToken,
    locale,
    searchParams,
    router,
  });

  const chat = useMessagingChatController({
    accessToken,
    locale,
    session,
    searchParams,
    router,
    mode: route.mode,
  });

  const {
    mode,
    switchMode,
    chatBackgroundId,
    setChatBackgroundId,
    chatBackgroundPickerOpen,
    setChatBackgroundPickerOpen,
    mailEmbedFullscreen,
    setMailEmbedFullscreen,
  } = route;

  const {
    threads,
    messages,
    errorMessage,
    moduleBlocked,
    totalUnread,
    isCompanyOwner,
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
    groupSelected,
    setGroupSelected,
    isBusy,
    quickReplyAdminOpen,
    setQuickReplyAdminOpen,
    orgQuickReplyDrafts,
    setOrgQuickReplyDrafts,
    quickReplyAdminBusy,
    createGroupThread,
    saveEditedMessage,
    confirmDeleteMessage,
    saveOrgQuickReplies,
    handleExportArchive,
    activeThreadId,
    mobileThreadOpen,
  } = chat;

  return (
    <ModulePageShell>
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

      <div
        className={
          mailEmbedFullscreen
            ? "messaging-page-layout messaging-page-layout--fullscreen"
            : "messaging-page-layout"
        }
      >
        <div className="messaging-page-main">
          {mode === "email" ? (
            <div className="messaging-email-stack">
              {!mailEmbedFullscreen ? (
                <OrganizationMailInboxPanel variant="messaging" />
              ) : null}
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
            </div>
          ) : (
            <div
              className={
                mobileThreadOpen && activeThreadId
                  ? "chat-layout chat-layout--mobile-thread"
                  : "chat-layout"
              }
            >
              <MessagingThreadSidebar
                chat={chat}
                locale={locale}
                accessToken={accessToken}
              />
              <MessagingConversationPanel
                chat={chat}
                accessToken={accessToken}
                locale={locale}
                session={session}
                chatBackgroundId={chatBackgroundId}
              />
            </div>
          )}
        </div>
        {!mailEmbedFullscreen ? (
          <MessagingSideRail
            mode={mode}
            onSwitchMode={switchMode}
            threadCount={threads.length}
            totalUnread={totalUnread}
            activeMessageCount={messages.length}
            isCompanyOwner={isCompanyOwner}
            onExportKvkk={() => void handleExportArchive()}
            showMailFullscreen={mode === "email"}
            onMailFullscreen={() => setMailEmbedFullscreen(true)}
            chatBackgroundId={chatBackgroundId}
            chatBackgroundPickerOpen={chatBackgroundPickerOpen}
            onToggleChatBackgroundPicker={() =>
              setChatBackgroundPickerOpen((open) => !open)
            }
            onChatBackgroundChange={setChatBackgroundId}
            onCloseChatBackgroundPicker={() =>
              setChatBackgroundPickerOpen(false)
            }
          />
        ) : null}
      </div>
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
