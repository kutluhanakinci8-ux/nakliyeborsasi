"use client";

import type { ReactNode } from "react";
import {
  IconBell,
  IconDownload,
  IconMail,
  IconMessageSquare,
  IconShieldLock,
} from "./ChatUiIcons";

type RailTileProps = {
  icon: ReactNode;
  value: string | number;
  label: string;
  title: string;
  variant?: "default" | "alert" | "secure" | "action";
  onClick?: () => void;
};

function ChatRailTile({
  icon,
  value,
  label,
  title,
  variant = "default",
  onClick,
}: RailTileProps) {
  const className = [
    "chat-rail-tile",
    variant !== "default" ? `chat-rail-tile--${variant}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        title={title}
        aria-label={title}
        onClick={onClick}
      >
        <span className="chat-rail-tile-icon" aria-hidden>{icon}</span>
        <span className="chat-rail-tile-value">{value}</span>
        <span className="chat-rail-tile-label">{label}</span>
      </button>
    );
  }

  return (
    <div className={className} title={title} aria-label={title}>
      <span className="chat-rail-tile-icon" aria-hidden>{icon}</span>
      <span className="chat-rail-tile-value">{value}</span>
      <span className="chat-rail-tile-label">{label}</span>
    </div>
  );
}

type Props = {
  threadCount: number;
  totalUnread: number;
  activeMessageCount: number;
  isCompanyOwner: boolean;
  onExportKvkk: () => void;
};

export function ChatStatsRail({
  threadCount,
  totalUnread,
  activeMessageCount,
  isCompanyOwner,
  onExportKvkk,
}: Props) {
  return (
    <aside className="chat-stats-rail" aria-label="Sohbet özet göstergeleri">
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
      <ChatRailTile
        icon={<IconShieldLock size={17} />}
        value="JWT"
        label="Güvenli"
        title="Oturum koruması (JWT)"
        variant="secure"
      />
      {isCompanyOwner ? (
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
