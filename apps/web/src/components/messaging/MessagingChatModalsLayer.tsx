"use client";

import type { MessagingChatController } from "../../hooks/useMessagingChatController";
import type { MessagingGroupParticipantRole } from "../../lib/messagingChatUi";
import { withDefaultGroupRole } from "../../lib/messagingGroupThreadPick";
import {
  ChatGroupThreadModal,
  ChatMessageDeleteModal,
  ChatMessageEditModal,
  ChatQuickReplyAdminModal,
} from "./ChatMessagingModals";

type Props = {
  chat: MessagingChatController;
};

/** Edit/delete, group thread, org quick-reply admin — shared by /messaging and Ekolojik hub. */
export function MessagingChatModalsLayer({ chat }: Props) {
  const {
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
    setGroupSearchHits,
    isBusy,
    createGroupThread,
    saveEditedMessage,
    confirmDeleteMessage,
    quickReplyAdminOpen,
    setQuickReplyAdminOpen,
    orgQuickReplyDrafts,
    setOrgQuickReplyDrafts,
    quickReplyAdminBusy,
    saveOrgQuickReplies,
  } = chat;

  return (
    <>
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
            return [...current, withDefaultGroupRole(company)].slice(0, 8);
          });
        }}
        onParticipantRoleChange={(companyId, role: MessagingGroupParticipantRole) => {
          setGroupSelected((current) =>
            current.map((row) =>
              row.companyId === companyId
                ? { ...row, participantRole: role }
                : row,
            ),
          );
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
    </>
  );
}
