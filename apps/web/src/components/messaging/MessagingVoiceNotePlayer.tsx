"use client";

import { useEffect, useRef, useState } from "react";
import { MessagingApiClient } from "../../lib/MessagingApiClient";
import type { ThreadMessageAttachmentRecord } from "../../lib/MessagingApiClient";
import { MessagingVoiceNoteTranscript } from "./MessagingVoiceNoteTranscript";

type Props = {
  accessToken: string;
  locale: string;
  threadId: string;
  messageId: string;
  attachmentIndex: number;
  attachment: ThreadMessageAttachmentRecord;
  durationMs?: number;
  advancedPlayer: boolean;
  transcribeEnabled: boolean;
  transcribeAdvancedEnabled: boolean;
  onTranscriptReady: () => void;
  onError: (message: string) => void;
};

export function MessagingVoiceNotePlayer({
  accessToken,
  locale,
  threadId,
  messageId,
  attachmentIndex,
  attachment,
  durationMs,
  advancedPlayer,
  transcribeEnabled,
  transcribeAdvancedEnabled,
  onTranscriptReady,
  onError,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    let objectUrl: string | null = null;
    void MessagingApiClient.downloadAttachment(
      accessToken,
      locale,
      threadId,
      messageId,
      attachmentIndex,
    )
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch((error) => {
        onError(error instanceof Error ? error.message : "Ses yüklenemedi");
      });
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    accessToken,
    locale,
    threadId,
    messageId,
    attachmentIndex,
    onError,
  ]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, [rate, src]);

  const label =
    durationMs && durationMs > 0
      ? `${Math.round(durationMs / 1000)} sn`
      : "Sesli mesaj";

  return (
    <div className="chat-voice-note" role="group" aria-label="Sesli mesaj">
      <span className="chat-voice-note-badge" aria-hidden>🎤</span>
      {src ? (
        <audio
          ref={audioRef}
          className="chat-voice-note-audio"
          controls
          preload="metadata"
          src={src}
        >
          <track kind="captions" />
        </audio>
      ) : (
        <span className="chat-voice-note-loading">Yükleniyor…</span>
      )}
      <span className="chat-voice-note-meta">{label}</span>
      {advancedPlayer && src ? (
        <div className="chat-voice-note-rates" role="group" aria-label="Oynatma hızı">
          {[1, 1.5].map((value) => (
            <button
              key={value}
              type="button"
              className={
                rate === value
                  ? "chat-voice-note-rate chat-voice-note-rate--active"
                  : "chat-voice-note-rate"
              }
              onClick={() => setRate(value)}
            >
              {value}x
            </button>
          ))}
        </div>
      ) : null}
      <MessagingVoiceNoteTranscript
        accessToken={accessToken}
        locale={locale}
        threadId={threadId}
        messageId={messageId}
        attachment={attachment}
        transcribeEnabled={transcribeEnabled}
        transcribeAdvancedEnabled={transcribeAdvancedEnabled}
        onTranscriptReady={onTranscriptReady}
        onError={onError}
      />
    </div>
  );
}
