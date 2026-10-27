import { BadRequestException } from "@nestjs/common";
import type { MessagingAttachmentInput } from "./MessagingAttachmentStorageService";
import { messagingVoiceNoteMaxDurationMs } from "./messagingVoiceNoteConfig";

function isAudioContentType(contentType: string): boolean {
  return contentType.toLowerCase().startsWith("audio/");
}

export function assertVoiceNoteAttachmentsAllowed(
  attachments: MessagingAttachmentInput[] | undefined,
): void {
  if (!attachments?.length) {
    return;
  }
  const voiceNotes = attachments.filter((row) => row.kind === "voice_note");
  if (voiceNotes.length === 0) {
    return;
  }
  if (attachments.length !== 1) {
    throw new BadRequestException(
      "Sesli mesaj yalnızca tek başına gönderilebilir.",
    );
  }
  const note = voiceNotes[0];
  if (!isAudioContentType(note.contentType)) {
    throw new BadRequestException("Sesli mesaj audio içerik türü gerektirir.");
  }
  const maxMs = messagingVoiceNoteMaxDurationMs();
  if (
    note.durationMs !== undefined &&
    (note.durationMs < 500 || note.durationMs > maxMs)
  ) {
    throw new BadRequestException(
      `Sesli mesaj süresi 0,5–${Math.round(maxMs / 1000)} sn arasında olmalı.`,
    );
  }
}

export function defaultBodyTextForAttachments(
  bodyText: string,
  attachments: MessagingAttachmentInput[] | undefined,
): string {
  const trimmed = bodyText.trim();
  if (trimmed) {
    return trimmed;
  }
  if (attachments?.some((row) => row.kind === "voice_note")) {
    return "🎤 Sesli mesaj";
  }
  if (attachments?.length) {
    return "📎 Ek dosya";
  }
  return trimmed;
}
