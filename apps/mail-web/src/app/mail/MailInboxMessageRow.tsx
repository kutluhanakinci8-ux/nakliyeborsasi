"use client";

import {
  formatMailListDate,
  mailSenderInitials,
  mailSenderLabel,
} from "@/lib/mailDisplay";

type RowMessage = {
  id: string;
  fromAddress: string;
  subject: string;
  snippet: string | null;
  receivedAt: string;
  readAt: string | null;
  attachmentCount?: number;
  starredAt?: string | null;
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
  const starred = Boolean(m.starredAt);
  const sender = mailSenderLabel(m.fromAddress);
  const dateLabel = formatMailListDate(m.receivedAt);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`mail-inbox-row ${selected ? "selected" : ""} ${unread ? "unread" : ""}`}
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
          aria-label="Mesajı seç"
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
          <span className="mail-inbox-row-sender">{sender}</span>
          <span className="mail-inbox-row-date">{dateLabel}</span>
        </div>
        <div className="mail-inbox-row-subject">{m.subject || "(Konu yok)"}</div>
        {m.snippet ? (
          <div className="mail-inbox-row-snippet">{m.snippet}</div>
        ) : null}
        {(m.attachmentCount ?? 0) > 0 ? (
          <span className="mail-inbox-row-attach" title="Ek var">
            Ek
          </span>
        ) : null}
      </div>
      {showStar ? (
        <button
          type="button"
          className={`mail-inbox-row-star ${starred ? "starred" : ""}`}
          aria-label={starred ? "Yıldızı kaldır" : "Yıldızla"}
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
