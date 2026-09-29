"use client";

import { useEffect, useRef } from "react";
import { IconX } from "./ChatUiIcons";
import {
  CHAT_CONVERSATION_BACKGROUNDS,
  type ChatConversationBackgroundId,
} from "../../lib/messagingChatBackground";

type Props = {
  open: boolean;
  value: ChatConversationBackgroundId;
  onChange: (id: ChatConversationBackgroundId) => void;
  onClose: () => void;
};

export function ChatConversationBackgroundPicker({
  open,
  value,
  onChange,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (event: MouseEvent) => {
      const node = panelRef.current;
      if (!node) {
        return;
      }
      if (!node.contains(event.target as Node)) {
        onClose();
      }
    };
    window.setTimeout(() => {
      window.addEventListener("mousedown", onPointer);
    }, 0);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className="chat-bg-picker"
      role="dialog"
      aria-labelledby="chat-bg-picker-title"
      aria-modal="false"
    >
      <div className="chat-bg-picker-header">
        <p id="chat-bg-picker-title" className="chat-bg-picker-title">
          Konuşma zemini
        </p>
        <button
          type="button"
          className="chat-bg-picker-close"
          aria-label="Kapat"
          onClick={onClose}
        >
          <IconX size={16} />
        </button>
      </div>
      <p className="chat-bg-picker-lead">
        Mesaj alanı arka planını seçin. Tercih bu cihazda saklanır.
      </p>
      <ul className="chat-bg-picker-grid">
        {CHAT_CONVERSATION_BACKGROUNDS.map((option) => {
          const active = option.id === value;
          return (
            <li key={option.id}>
              <button
                type="button"
                className={
                  active
                    ? "chat-bg-swatch chat-bg-swatch--active"
                    : "chat-bg-swatch"
                }
                title={option.description}
                aria-pressed={active}
                onClick={() => {
                  onChange(option.id);
                  onClose();
                }}
              >
                <span
                  className="chat-bg-swatch-preview"
                  style={{ background: option.preview }}
                  data-chat-bg-preview={option.id}
                  aria-hidden
                />
                <span className="chat-bg-swatch-label">{option.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
