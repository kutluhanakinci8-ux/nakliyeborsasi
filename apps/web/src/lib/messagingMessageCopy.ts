import type { ThreadMessageAttachmentRecord } from "./MessagingApiClient";

export function buildCopyableMessageText(params: {
  bodyText: string;
  deleted?: boolean;
  attachments?: ThreadMessageAttachmentRecord[];
  /** Çeviri gösteriliyorsa panoya çeviri metni gider. */
  translationOverlay?: string;
}): string | null {
  if (params.deleted) {
    return null;
  }
  let text = params.translationOverlay?.trim() || params.bodyText?.trim() || "";
  const voiceTranscript = params.attachments
    ?.map(
      (row) =>
        row.transcript?.displayText ??
        row.transcript?.editedText ??
        row.transcript?.text,
    )
    .find((row) => row?.trim());
  if (
    voiceTranscript &&
    (!text || text === "🎤 Sesli mesaj" || text === "[audio]")
  ) {
    text = voiceTranscript.trim();
  }
  if (text === "[Mesaj silindi]") {
    return null;
  }
  if (text) {
    return text;
  }
  const names = params.attachments
    ?.map((row) => row.filename?.trim())
    .filter(Boolean);
  if (names && names.length > 0) {
    return names.join("\n");
  }
  return null;
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!ok) {
    throw new Error("clipboard-failed");
  }
}
