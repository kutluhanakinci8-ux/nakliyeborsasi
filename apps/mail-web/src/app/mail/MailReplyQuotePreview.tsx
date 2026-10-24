"use client";

import type { MailReplyQuoteMode } from "@/lib/mailApi";
import {
  buildReplyQuotePreview,
  type ReplyQuotePreviewSource,
} from "@/lib/mailReplyQuotePreview";

type Props = {
  source: ReplyQuotePreviewSource;
  mode: MailReplyQuoteMode;
  draftText: string;
};

export function MailReplyQuotePreview({ source, mode, draftText }: Props) {
  const quote = buildReplyQuotePreview(source, mode);
  if (!quote.trim()) {
    return null;
  }
  const preview = draftText.trim()
    ? `${draftText.trim()}\n${quote}`
    : quote;
  return (
    <div className="mail-reply-quote-preview" aria-label="Yanıt alıntı önizleme">
      <div className="mail-reply-quote-preview-head">
        <span className="mail-reply-quote-preview-label">Gönderim önizleme</span>
        <span className="mail-reply-quote-preview-mode">
          {mode === "full" ? "Tam alıntı" : mode === "trimmed" ? "Kısa alıntı" : ""}
        </span>
      </div>
      <pre className="mail-reply-quote-preview-body">{preview}</pre>
    </div>
  );
}
