"use client";

import type { MailReplyQuoteMode } from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";
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
  const { locale, t } = useMailLocale();
  const draftHtml = draftText.trim()
    ? draftText.trim().replace(/\n/g, "<br/>")
    : "";
  const previewLocale = locale === "en" ? "en-GB" : "tr-TR";
  const previewHtml = buildReplyQuotePreviewHtml(source, mode, draftHtml, {
    locale: previewLocale,
  });
  if (!previewHtml.trim()) {
    return null;
  }
  return (
    <div
      className="mail-reply-quote-preview"
      aria-label={t("replyQuotePreviewAria")}
    >
      <div className="mail-reply-quote-preview-head">
        <span className="mail-reply-quote-preview-label">
          {t("replyQuotePreviewLabel")}
        </span>
        <span className="mail-reply-quote-preview-mode">
          {mode === "full"
            ? t("replyQuoteModeFull")
            : mode === "trimmed"
              ? t("replyQuoteModeTrimmed")
              : ""}
        </span>
      </div>
      <div
        className="mail-reply-quote-preview-body mail-reply-quote-preview-body--html"
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />
    </div>
  );
}
