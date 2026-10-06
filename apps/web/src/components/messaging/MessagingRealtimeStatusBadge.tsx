"use client";

import type { MessagingRealtimeTransport } from "../../hooks/useMessagingChatController";

const LABELS: Record<MessagingRealtimeTransport, string> = {
  sse: "Canlı (SSE)",
  polling: "Yedek senkron",
  idle: "Bağlantı bekleniyor",
};

const HINTS: Record<MessagingRealtimeTransport, string> = {
  sse: "Mesajlar anlık akış ile güncellenir (Redis fan-out).",
  polling: "SSE geçici kapalı; liste periyodik yenileniyor.",
  idle: "Oturum veya sohbet modu hazır değil.",
};

type Props = {
  transport: MessagingRealtimeTransport;
  className?: string;
};

export function MessagingRealtimeStatusBadge({ transport, className }: Props) {
  const modifier =
    transport === "sse"
      ? "messaging-realtime-badge--live"
      : transport === "polling"
        ? "messaging-realtime-badge--poll"
        : "messaging-realtime-badge--idle";

  return (
    <span
      className={["messaging-realtime-badge", modifier, className]
        .filter(Boolean)
        .join(" ")}
      role="status"
      title={HINTS[transport]}
    >
      <span className="messaging-realtime-badge-dot" aria-hidden />
      {LABELS[transport]}
    </span>
  );
}
