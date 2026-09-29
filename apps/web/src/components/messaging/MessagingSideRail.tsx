"use client";

import type { ReactNode } from "react";
import {
  IconBell,
  IconDownload,
  IconMail,
  IconMaximize,
  IconMessageSquare,
  IconPalette,
  IconShieldLock,
} from "./ChatUiIcons";
import { ChatConversationBackgroundPicker } from "./ChatConversationBackgroundPicker";
import {
  chatBackgroundLabel,
  type ChatConversationBackgroundId,
} from "../../lib/messagingChatBackground";

type RailTileProps = {
  icon: ReactNode;
  value?: string | number | null;
  label: string;
  title: string;
  variant?: "default" | "alert" | "secure" | "action" | "mode-active";
  onClick?: () => void;
  role?: "tab";
  ariaSelected?: boolean;
};

function ChatRailTile({
  icon,
  value = null,
  label,
  title,
  variant = "default",
  onClick,
  role,
  ariaSelected,
}: RailTileProps) {
  const className = [
    "chat-rail-tile",
    variant !== "default" ? `chat-rail-tile--${variant}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      <span className="chat-rail-tile-icon" aria-hidden>{icon}</span>
      {value !== null && value !== undefined ? (
        <span className="chat-rail-tile-value">{value}</span>
      ) : (
        <span className="chat-rail-tile-value chat-rail-tile-value--label">
          {label}
        </span>
      )}
      {value !== null && value !== undefined ? (
        <span className="chat-rail-tile-label">{label}</span>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        title={title}
        aria-label={title}
        role={role}
        aria-selected={role === "tab" ? ariaSelected : undefined}
        onClick={onClick}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={className} title={title} aria-label={title}>
      {body}
    </div>
  );
}

export type MessagingSideRailMode = "chat" | "email";

type Props = {
  mode: MessagingSideRailMode;
  onSwitchMode: (mode: MessagingSideRailMode) => void;
  threadCount: number;
  totalUnread: number;
  activeMessageCount: number;
  isCompanyOwner: boolean;
  onExportKvkk: () => void;
  onMailFullscreen?: () => void;
  showMailFullscreen?: boolean;
  chatBackgroundId?: ChatConversationBackgroundId;
  chatBackgroundPickerOpen?: boolean;
  onToggleChatBackgroundPicker?: () => void;
  onChatBackgroundChange?: (id: ChatConversationBackgroundId) => void;
  onCloseChatBackgroundPicker?: () => void;
};

export function MessagingSideRail({
  mode,
  onSwitchMode,
  threadCount,
  totalUnread,
  activeMessageCount,
  isCompanyOwner,
  onExportKvkk,
  onMailFullscreen,
  showMailFullscreen,
  chatBackgroundId = "default",
  chatBackgroundPickerOpen = false,
  onToggleChatBackgroundPicker,
  onChatBackgroundChange,
  onCloseChatBackgroundPicker,
}: Props) {
  const bgLabel = chatBackgroundLabel(chatBackgroundId);

  return (
    <aside
      className="chat-stats-rail chat-stats-rail--with-picker"
      aria-label="Mesajlar gezinme ve özet"
      role="navigation"
    >
      <p className="chat-stats-rail-heading">Görünüm</p>
      <div className="chat-rail-mode-group" role="tablist" aria-label="Mesajlar görünümü">
        <ChatRailTile
          icon={<IconMail size={17} />}
          label="Posta"
          title="Kurumsal e-posta (posta)"
          variant={mode === "email" ? "mode-active" : "default"}
          role="tab"
          ariaSelected={mode === "email"}
          onClick={() => onSwitchMode("email")}
        />
        <ChatRailTile
          icon={<IconMessageSquare size={17} />}
          label="Sohbet"
          title="Firma sohbeti"
          variant={mode === "chat" ? "mode-active" : "default"}
          role="tab"
          ariaSelected={mode === "chat"}
          onClick={() => onSwitchMode("chat")}
        />
      </div>
      {showMailFullscreen && onMailFullscreen ? (
        <ChatRailTile
          icon={<IconMaximize size={17} />}
          label="Tam"
          title="Posta görünümünü tam ekran aç"
          variant="action"
          onClick={onMailFullscreen}
        />
      ) : null}
      {mode === "chat" ? (
        <>
          <ChatRailTile
            icon={<IconPalette size={17} />}
            label="Zemin"
            title={`Konuşma zemini: ${bgLabel}`}
            variant={
              chatBackgroundPickerOpen || chatBackgroundId !== "default"
                ? "mode-active"
                : "default"
            }
            onClick={onToggleChatBackgroundPicker}
          />
          {onChatBackgroundChange && onCloseChatBackgroundPicker ? (
            <ChatConversationBackgroundPicker
              open={chatBackgroundPickerOpen}
              value={chatBackgroundId}
              onChange={onChatBackgroundChange}
              onClose={onCloseChatBackgroundPicker}
            />
          ) : null}
          <div className="chat-rail-divider" aria-hidden />
          <p className="chat-stats-rail-heading">Özet</p>
          <ChatRailTile
            icon={<IconMessageSquare size={17} />}
            value={threadCount}
            label="Sohbet"
            title={`Aktif sohbet: ${threadCount}`}
          />
          <ChatRailTile
            icon={<IconBell size={17} />}
            value={totalUnread}
            label="Okunmamış"
            title={`Okunmamış: ${totalUnread}`}
            variant={totalUnread > 0 ? "alert" : "default"}
          />
          <ChatRailTile
            icon={<IconMail size={17} />}
            value={activeMessageCount}
            label="Mesaj"
            title={`Bu sohbette mesaj: ${activeMessageCount}`}
          />
        </>
      ) : null}
      <div className="chat-rail-divider" aria-hidden />
      <ChatRailTile
        icon={<IconShieldLock size={17} />}
        value="JWT"
        label="Güvenli"
        title="Oturum koruması (JWT)"
        variant="secure"
      />
      {isCompanyOwner && mode === "chat" ? (
        <ChatRailTile
          icon={<IconDownload size={17} />}
          value="JSON"
          label="KVKK"
          title="KVKK dışa aktar (JSON)"
          variant="action"
          onClick={onExportKvkk}
        />
      ) : null}
    </aside>
  );
}
