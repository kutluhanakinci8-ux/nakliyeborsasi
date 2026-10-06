"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconCheck,
  IconEye,
  IconLanguages,
  IconPencil,
  IconReply,
  IconTrash,
  IconX,
} from "./ChatUiIcons";
import {
  operationStampLabel,
  type MessagingOperationStampType,
} from "../../lib/messagingChatUi";

const STAMP_TYPES: MessagingOperationStampType[] = [
  "approved",
  "rejected",
  "acknowledged",
];

const TRANSLATE_TARGETS = ["en", "de", "ru"] as const;

type ChatMessageActionBarProps = {
  isMine: boolean;
  deleted: boolean;
  isInternal: boolean;
  translateBusy: boolean;
  stampBusy: boolean;
  onReply: () => void;
  onStamp: (stampType: MessagingOperationStampType) => void;
  onTranslate: (target: string) => void;
  onEdit: () => void;
  onDelete?: () => void;
};

export function ChatMessageActionBar({
  isMine,
  deleted,
  isInternal,
  translateBusy,
  stampBusy,
  onReply,
  onStamp,
  onTranslate,
  onEdit,
  onDelete,
}: ChatMessageActionBarProps) {
  const [translateOpen, setTranslateOpen] = useState(false);
  const translateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!translateOpen) {
      return;
    }
    const handlePointer = (event: MouseEvent) => {
      if (
        translateRef.current &&
        !translateRef.current.contains(event.target as Node)
      ) {
        setTranslateOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [translateOpen]);

  const showCounterpartyActions = !isMine && !deleted && !isInternal;
  const showOwnerActions = isMine && !deleted;

  return (
    <div
      className="chat-message-actions"
      role="toolbar"
      aria-label="Mesaj işlemleri"
    >
      {showCounterpartyActions ? (
        <>
          <button
            type="button"
            className="chat-icon-btn"
            aria-label="Yanıtla"
            onClick={onReply}
          >
            <IconReply size={16} />
          </button>
          <div className="chat-icon-btn-group" role="group" aria-label="Damga">
            {STAMP_TYPES.map((stampType) => (
              <button
                key={stampType}
                type="button"
                className={`chat-icon-btn chat-icon-btn--stamp chat-icon-btn--stamp-${stampType}`}
                aria-label={operationStampLabel(stampType)}
                disabled={stampBusy}
                onClick={() => onStamp(stampType)}
              >
                {stampType === "approved" ? (
                  <IconCheck size={15} />
                ) : stampType === "rejected" ? (
                  <IconX size={15} />
                ) : (
                  <IconEye size={15} />
                )}
              </button>
            ))}
          </div>
        </>
      ) : null}
      <div className="chat-translate-anchor" ref={translateRef}>
        <button
          type="button"
          className="chat-icon-btn"
          aria-label="Çevir"
          aria-expanded={translateOpen}
          aria-haspopup="menu"
          disabled={translateBusy}
          onClick={() => setTranslateOpen((open) => !open)}
        >
          <IconLanguages size={16} />
        </button>
        {translateOpen ? (
          <ul className="chat-translate-menu" role="menu" aria-label="Dil seçin">
            {TRANSLATE_TARGETS.map((target) => (
              <li key={target} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="chat-translate-menu-item"
                  disabled={translateBusy}
                  onClick={() => {
                    setTranslateOpen(false);
                    onTranslate(target);
                  }}
                >
                  {target === "en"
                    ? "English"
                    : target === "de"
                      ? "Deutsch"
                      : "Русский"}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {showOwnerActions ? (
        <>
          <button
            type="button"
            className="chat-icon-btn"
            aria-label="Düzenle"
            onClick={onEdit}
          >
            <IconPencil size={16} />
          </button>
          {onDelete ? (
            <button
              type="button"
              className="chat-icon-btn chat-icon-btn--danger"
              aria-label="Sil"
              onClick={onDelete}
            >
              <IconTrash size={16} />
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
