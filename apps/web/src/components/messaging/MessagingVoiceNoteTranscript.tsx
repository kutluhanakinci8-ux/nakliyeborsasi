"use client";

import { useState } from "react";
import { IconSparkles } from "./ChatUiIcons";
import { MessagingApiClient } from "../../lib/MessagingApiClient";
import type { ThreadMessageAttachmentRecord } from "../../lib/MessagingApiClient";

type Props = {
  accessToken: string;
  locale: string;
  threadId: string;
  messageId: string;
  attachment: ThreadMessageAttachmentRecord;
  transcribeEnabled: boolean;
  onTranscriptReady: () => void;
  onError: (message: string) => void;
};

export function MessagingVoiceNoteTranscript({
  accessToken,
  locale,
  threadId,
  messageId,
  attachment,
  transcribeEnabled,
  onTranscriptReady,
  onError,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [localText, setLocalText] = useState<string | null>(
    attachment.transcript?.status === "ready" ? attachment.transcript.text : null,
  );

  if (!transcribeEnabled) {
    return null;
  }

  async function requestTranscript(): Promise<void> {
    const accepted = window.confirm(
      "Ses kaydını yazıya çevirmek için ses işleme yapılacaktır. Devam etmek için onaylayın (KVKK / AI asistan rızası gerekir).",
    );
    if (!accepted) {
      return;
    }
    setBusy(true);
    try {
      const result = await MessagingApiClient.transcribeVoiceAttachment(
        accessToken,
        locale,
        threadId,
        messageId,
        attachment.index,
      );
      if (result.transcript.status === "ready" && result.transcript.text) {
        setLocalText(result.transcript.text);
        onTranscriptReady();
      } else {
        onError(
          "Transkripsiyon tamamlanamadı. STT yapılandırmasını veya AI rızanızı kontrol edin.",
        );
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Transkripsiyon hatası");
    } finally {
      setBusy(false);
    }
  }

  if (localText) {
    return (
      <p className="chat-voice-transcript" role="note">
        <span className="chat-voice-transcript-label">Transkript</span>
        {localText}
      </p>
    );
  }

  return (
    <button
      type="button"
      className="chat-voice-transcript-btn"
      disabled={busy}
      onClick={() => void requestTranscript()}
    >
      <IconSparkles size={14} />
      <span>{busy ? "Yazıya çevriliyor…" : "Yazıya çevir (KVKK onaylı)"}</span>
    </button>
  );
}
