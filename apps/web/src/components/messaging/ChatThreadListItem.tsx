"use client";

import {
  companyInitials,
  formatThreadListPreview,
  formatThreadListTime,
} from "../../lib/messagingChatUi";
import type { MessagingThreadRecord } from "../../lib/MessagingApiClient";
import { IconUsers } from "./ChatUiIcons";

function shortCompanyId(companyId: string): string {
  if (companyId.length < 13) {
    return companyId;
  }
  return `${companyId.slice(0, 8)}…${companyId.slice(-4)}`;
}

type Props = {
  thread: MessagingThreadRecord;
  active: boolean;
  locale: string;
  onSelect: () => void;
};

export function ChatThreadListItem({
  thread,
  active,
  locale,
  onSelect,
}: Props) {
  const isGroup = thread.threadKind === "group";
  const displayName =
    thread.counterpartyLegalName?.trim() ||
    thread.title?.trim() ||
    shortCompanyId(thread.counterpartyCompanyId);
  const previewRaw = thread.lastMessagePreview?.trim();
  const preview = previewRaw
    ? formatThreadListPreview(previewRaw)
    : thread.freightListingId
      ? `İlan · ${thread.freightListingId.slice(0, 8)}…`
      : "Firma sohbeti";
  const timeLabel = formatThreadListTime(thread.lastMessageAt, locale);
  const unread = thread.unreadCount ?? 0;

  return (
    <li>
      <button
        type="button"
        className={
          active ? "chat-thread-item chat-thread-item--active" : "chat-thread-item"
        }
        onClick={onSelect}
      >
        <span
          className={
            isGroup
              ? "chat-thread-avatar chat-thread-avatar--group"
              : "chat-thread-avatar"
          }
          aria-hidden
        >
          {isGroup ? (
            <IconUsers size={18} />
          ) : (
            companyInitials(displayName)
          )}
        </span>
        <span className="chat-thread-body">
          <span className="chat-thread-top">
            <span className="chat-thread-title" title={displayName}>
              {displayName}
            </span>
            {timeLabel ? (
              <time
                className="chat-thread-time"
                dateTime={thread.lastMessageAt ?? undefined}
              >
                {timeLabel}
              </time>
            ) : null}
          </span>
          <span className="chat-thread-bottom">
            <span className="chat-thread-sub" title={previewRaw ?? preview}>
              {preview}
            </span>
            {unread > 0 ? (
              <span className="chat-unread-badge" aria-label={`${unread} okunmamış`}>
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}
