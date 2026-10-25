import type { MailReplyQuoteMode } from "@/lib/mailApi";

export type ReplyQuotePreviewSource = {
  fromAddress: string;
  receivedAt: string;
  bodyText?: string | null;
  bodyHtml?: string | null;
  snippet?: string | null;
};

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function plainBody(source: ReplyQuotePreviewSource): string {
  return (
    source.bodyText?.trim() ||
    stripHtml(source.bodyHtml ?? "") ||
    source.snippet ||
    ""
  );
}

function quoteAttributionLine(
  source: ReplyQuotePreviewSource,
  locale = "tr-TR",
): string {
  const date = new Date(source.receivedAt).toLocaleString(locale);
  return `--- ${date} tarihinde ${source.fromAddress} yazdı ---`;
}

/** İstemci yanıt alıntısı önizleme (sunucu buildReplyQuoteBlock ile uyumlu). */
export function buildReplyQuotePreview(
  source: ReplyQuotePreviewSource,
  mode: MailReplyQuoteMode,
  locale = "tr-TR",
): string {
  if (mode === "none") {
    return "";
  }
  let body = plainBody(source) || "(İçerik yok)";
  if (mode === "trimmed" && body.length > 480) {
    body = `${body.slice(0, 480).trim()}…`;
  }
  const quotedLines = body
    .split("\n")
    .map((line) => (line.trim().length > 0 ? `> ${line}` : ">"));
  return ["", quoteAttributionLine(source, locale), ...quotedLines].join("\n");
}

function quoteBodyHtmlFromPlain(body: string): string {
  return body
    .split("\n")
    .map((line) => escapeHtml(line))
    .join("<br/>");
}

/** Outlook tarzı HTML alıntı önizleme (compose WYSIWYG). */
export function buildReplyQuotePreviewHtml(
  source: ReplyQuotePreviewSource,
  mode: MailReplyQuoteMode,
  draftHtml?: string,
  options?: { locale?: string },
): string {
  if (mode === "none") {
    return draftHtml?.trim() ?? "";
  }

  const locale = options?.locale ?? "tr-TR";
  const attribution = escapeHtml(quoteAttributionLine(source, locale));
  const draftBlock = draftHtml?.trim()
    ? `<div class="mail-reply-draft">${draftHtml}</div>`
    : "";

  let quotedInner: string;
  const htmlSource = source.bodyHtml?.trim();
  if (mode === "full" && htmlSource) {
    quotedInner = `<div class="mail-reply-quote-original-html">${htmlSource}</div>`;
  } else {
    let body = plainBody(source) || "(İçerik yok)";
    if (mode === "trimmed" && body.length > 480) {
      body = `${body.slice(0, 480).trim()}…`;
    }
    quotedInner = quoteBodyHtmlFromPlain(body);
  }

  return `${draftBlock}<div class="mail-reply-quote-wrap"><p class="mail-reply-quote-attribution">${attribution}</p><blockquote class="mail-reply-quote-block">${quotedInner}</blockquote></div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
