"use client";

import {
  formatMailListDate,
  mailSenderInitials,
  mailSenderLabel,
} from "@/lib/mailDisplay";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import {
  inboxSourceBadgeClass,
  inboxSourceBadgeLabel,
} from "@/lib/mailInboxSourceUi";
import {
  UserCategoryBadge,
  type MailUserInboxCategory,
} from "@/lib/mailUserInboxCategoryUi";

type RowMessage = {
  id: string;
  fromAddress: string;
  subject: string;
  snippet: string | null;
  receivedAt: string;
  readAt: string | null;
  attachmentCount?: number;
  starredAt?: string | null;
  inboxSource?: {
    label: string;
    provider: string;
    accountEmail?: string | null;
  };
  userCategory?: MailUserInboxCategory | null;
};

type Props = {
  message: RowMessage;
  selected: boolean;
  unread: boolean;
  showStar: boolean;
  showCheckbox: boolean;
  checked: boolean;
  onOpen: () => void;
  onToggleStar: () => void;
  onToggleCheck: (shiftKey: boolean) => void;
};

export function MailInboxMessageRow({
  message: m,
  selected,
  unread,
  showStar,
  showCheckbox,
  checked,
  onOpen,
  onToggleStar,
  onToggleCheck,
}: Props) {
  const { t } = useMailLocale();
  const noSubjectLabel = t("noSubject");
  const starred = Boolean(m.starredAt);
  const sender = mailSenderLabel(m.fromAddress);
  const dateLabel = formatMailListDate(m.receivedAt);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`mail-inbox-row ${selected ? "selected" : ""} ${unread ? "unread" : "read"}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onOpen();
        }
      }}
    >
      {unread ? (
        <span className="mail-inbox-row-unread-dot" aria-hidden="true" />
      ) : (
        <span className="mail-inbox-row-unread-spacer" aria-hidden="true" />
      )}
      {showCheckbox ? (
        <input
          type="checkbox"
          className="mail-inbox-row-check"
          checked={checked}
          aria-label={t("rowSelectAria")}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCheck(e.shiftKey);
          }}
          onChange={() => {}}
        />
      ) : null}
      <div className="mail-inbox-row-avatar" aria-hidden="true">
        {mailSenderInitials(m.fromAddress)}
      </div>
      <div className="mail-inbox-row-body">
        <div className="mail-inbox-row-top">
          <span className="mail-inbox-row-sender">
            {sender}
            {m.inboxSource && m.inboxSource.provider !== "lerta" ? (
              <span
                className={inboxSourceBadgeClass(m.inboxSource.provider)}
                title={
                  m.inboxSource.accountEmail
                    ? m.inboxSource.accountEmail
                    : m.inboxSource.label
                }
              >
                {inboxSourceBadgeLabel(
                  m.inboxSource.provider,
                  m.inboxSource.label,
                  t,
                )}
              </span>
            ) : null}
            {m.userCategory ? (
              <UserCategoryBadge category={m.userCategory} compact />
            ) : null}
          </span>
          <span className="mail-inbox-row-date">{dateLabel}</span>
        </div>
        <div className="mail-inbox-row-subject">
          {m.subject || noSubjectLabel}
        </div>
        {m.snippet ? (
          <div className="mail-inbox-row-snippet">{m.snippet}</div>
        ) : null}
        {(m.attachmentCount ?? 0) > 0 ? (
          <span className="mail-inbox-row-attach" title={t("attachHasTitle")}>
            {t("attachLabel")}
          </span>
        ) : null}
      </div>
      {showStar ? (
        <button
          type="button"
          className={`mail-inbox-row-star ${starred ? "starred" : ""}`}
          aria-label={starred ? t("starRemoveAria") : t("starAddAria")}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
        >
          {starred ? "★" : "☆"}
        </button>
      ) : null}
    </div>
  );
}
