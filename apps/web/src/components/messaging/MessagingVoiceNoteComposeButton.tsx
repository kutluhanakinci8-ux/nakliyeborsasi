"use client";

import { useEffect, useRef } from "react";
import { IconMic } from "./ChatUiIcons";
import { useMessagingVoiceNoteRecorder } from "../../hooks/useMessagingVoiceNoteRecorder";

type Props = {
  enabled: boolean;
  maxDurationMs: number;
  disabled: boolean;
  highlightFromDeepLink?: boolean;
  onDeepLinkHighlightConsumed?: () => void;
  onRecorded: (attachment: import("../../lib/messagingPageHelpers").PendingAttachment) => void;
  onError: (message: string) => void;
};

function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}:${rem.toString().padStart(2, "0")}`;
}

export function MessagingVoiceNoteComposeButton({
  enabled,
  maxDurationMs,
  disabled,
  highlightFromDeepLink = false,
  onDeepLinkHighlightConsumed,
  onRecorded,
  onError,
}: Props) {
  const micButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!highlightFromDeepLink || !enabled) {
      return;
    }
    micButtonRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    micButtonRef.current?.focus({ preventScroll: true });
  }, [highlightFromDeepLink, enabled]);

  const {
    isRecording,
    elapsedMs,
    startRecording,
    cancelRecording,
    finalizeRecording,
    state,
  } = useMessagingVoiceNoteRecorder({
    maxDurationMs,
    enabled,
    onError,
  });

  if (!enabled) {
    return null;
  }

  if (isRecording) {
    return (
      <div className="chat-voice-compose" role="group" aria-label="Sesli mesaj kaydı">
        <span className="chat-voice-compose-timer" role="status">
          {formatElapsed(elapsedMs)}
        </span>
        <button
          type="button"
          className="chat-voice-compose-btn chat-voice-compose-btn--cancel"
          onClick={() => cancelRecording()}
        >
          İptal
        </button>
        <button
          type="button"
          className="chat-voice-compose-btn chat-voice-compose-btn--send"
          disabled={state === "processing"}
          onClick={() => {
            void finalizeRecording().then((attachment) => {
              if (attachment) {
                onRecorded(attachment);
              }
            });
          }}
        >
          Gönder
        </button>
      </div>
    );
  }

  return (
    <button
      ref={micButtonRef}
      type="button"
      className={
        highlightFromDeepLink
          ? "chat-compose-tool-btn chat-compose-tool-btn--voice-deeplink"
          : "chat-compose-tool-btn"
      }
      disabled={disabled || state === "processing"}
      title="Sesli mesaj kaydet"
      aria-label="Sesli mesaj kaydet"
      onClick={() => {
        onDeepLinkHighlightConsumed?.();
        void startRecording();
      }}
    >
      <IconMic size={16} />
      <span className="sr-only">Sesli mesaj</span>
    </button>
  );
}
