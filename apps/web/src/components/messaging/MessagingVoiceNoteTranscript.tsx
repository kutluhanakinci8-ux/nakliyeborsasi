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
  transcribeAdvancedEnabled: boolean;
  sttConfigured: boolean;
  onTranscriptReady: () => void;
  onError: (message: string) => void;
};

function initialDisplayText(
  attachment: ThreadMessageAttachmentRecord,
): string | null {
  const t = attachment.transcript;
  if (!t || t.status !== "ready") {
    return null;
  }
  return t.displayText ?? t.editedText ?? t.text ?? null;
}

export function MessagingVoiceNoteTranscript({
  accessToken,
  locale,
  threadId,
  messageId,
  attachment,
  transcribeEnabled,
  transcribeAdvancedEnabled,
  sttConfigured,
  onTranscriptReady,
  onError,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [localText, setLocalText] = useState<string | null>(
    initialDisplayText(attachment),
  );
  const [confidence, setConfidence] = useState<number | null>(
    attachment.transcript?.confidenceScore ?? null,
  );

  if (!transcribeEnabled) {
    return null;
  }

  if (!sttConfigured) {
    return (
      <p className="chat-voice-transcript-missing" role="status">
        Ses→metin sunucusu yapılandırılmamış. Yönetici: yerel STT servisi (
        <code>MESSAGING_VOICE_STT_API_URL</code>) veya bulut Whisper anahtarı.
      </p>
    );
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
      const display =
        result.transcript.displayText ??
        result.transcript.editedText ??
        result.transcript.text;
      if (result.transcript.status === "ready" && display) {
        setLocalText(display);
        setConfidence(result.transcript.confidenceScore ?? null);
        onTranscriptReady();
      } else if (result.transcript.provider === "stt-busy") {
        onError(
          "Ses→metin servisi yoğun. Birkaç saniye sonra tekrar deneyin.",
        );
      } else if (result.transcript.provider === "stt-error") {
        onError(
          "Ses→metin sunucusu yanıt vermedi. Yönetici: STT konteyneri ve /messaging/integration/voice-stt/health.",
        );
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

  async function saveEdit(): Promise<void> {
    if (!transcribeAdvancedEnabled || !draft.trim()) {
      return;
    }
    setBusy(true);
    try {
      const result = await MessagingApiClient.editVoiceTranscript(
        accessToken,
        locale,
        threadId,
        messageId,
        attachment.index,
        draft.trim(),
      );
      const display =
        result.transcript.displayText ??
        result.transcript.editedText ??
        result.transcript.text;
      setLocalText(display ?? draft.trim());
      setEditing(false);
      onTranscriptReady();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Kayıt hatası");
    } finally {
      setBusy(false);
    }
  }

  if (localText && editing) {
    return (
      <div className="chat-voice-transcript-edit">
        <textarea
          className="chat-voice-transcript-textarea"
          value={draft}
          rows={3}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="chat-voice-transcript-edit-actions">
          <button type="button" onClick={() => setEditing(false)} disabled={busy}>
            İptal
          </button>
          <button type="button" onClick={() => void saveEdit()} disabled={busy}>
            Kaydet
          </button>
        </div>
      </div>
    );
  }

  if (localText) {
    return (
      <div className="chat-voice-transcript-wrap">
        <p className="chat-voice-transcript" role="note">
          <span className="chat-voice-transcript-label">Transkript</span>
          {localText}
        </p>
        {transcribeAdvancedEnabled && confidence !== null ? (
          <span className="chat-voice-transcript-confidence">
            Güven: {Math.round(confidence * 100)}%
          </span>
        ) : null}
        {transcribeAdvancedEnabled ? (
          <button
            type="button"
            className="chat-voice-transcript-edit-btn"
            onClick={() => {
              setDraft(localText);
              setEditing(true);
            }}
          >
            Düzenle
          </button>
        ) : null}
      </div>
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
