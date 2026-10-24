"use client";

import type { MailReplyQuoteMode } from "@/lib/mailApi";
import {
  buildReplyQuotePreviewHtml,
  type ReplyQuotePreviewSource,
} from "@/lib/mailReplyQuotePreview";

type Props = {
  source: ReplyQuotePreviewSource;
  mode: MailReplyQuoteMode;
  draftText: string;
};

export function MailReplyQuotePreview({ source, mode, draftText }: Props) {
  const draftHtml = draftText.trim()
    ? draftText.trim().replace(/\n/g, "<br/>")
    : "";
  const previewHtml = buildReplyQuotePreviewHtml(source, mode, draftHtml);
  if (!previewHtml.trim()) {
    return null;
  }
  return (
    <div className="mail-reply-quote-preview" aria-label="Yanıt alıntı önizleme">
      <div className="mail-reply-quote-preview-head">
        <span className="mail-reply-quote-preview-label">Gönderim önizleme (WYSIWYG)</span>
        <span className="mail-reply-quote-preview-mode">
          {mode === "full" ? "Tam alıntı" : mode === "trimmed" ? "Kısa alıntı" : ""}
        </span>
      </div>
      <div
        className="mail-reply-quote-preview-body mail-reply-quote-preview-body--html"
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />
    </div>
  );
}
