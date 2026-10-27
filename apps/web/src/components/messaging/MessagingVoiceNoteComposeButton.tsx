"use client";

import { IconMic } from "./ChatUiIcons";
import { useMessagingVoiceNoteRecorder } from "../../hooks/useMessagingVoiceNoteRecorder";

type Props = {
  enabled: boolean;
  maxDurationMs: number;
  disabled: boolean;
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
  onRecorded,
  onError,
}: Props) {
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
      type="button"
      className="chat-compose-tool-btn"
      disabled={disabled || state === "processing"}
      title="Sesli mesaj kaydet"
      aria-label="Sesli mesaj kaydet"
      onClick={() => void startRecording()}
    >
      <IconMic size={16} />
      <span className="sr-only">Sesli mesaj</span>
    </button>
  );
}
