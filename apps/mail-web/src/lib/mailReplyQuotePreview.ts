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

/** İstemci yanıt alıntısı önizleme (sunucu buildReplyQuoteBlock ile uyumlu). */
export function buildReplyQuotePreview(
  source: ReplyQuotePreviewSource,
  mode: MailReplyQuoteMode,
): string {
  if (mode === "none") {
    return "";
  }
  const date = new Date(source.receivedAt).toLocaleString("tr-TR");
  let body = plainBody(source) || "(İçerik yok)";
  if (mode === "trimmed" && body.length > 480) {
    body = `${body.slice(0, 480).trim()}…`;
  }
  const quotedLines = body
    .split("\n")
    .map((line) => (line.trim().length > 0 ? `> ${line}` : ">"));
  return [
    "",
    `--- ${date} tarihinde ${source.fromAddress} yazdı ---`,
    ...quotedLines,
  ].join("\n");
}

/** Outlook tarzı HTML alıntı önizleme (compose WYSIWYG). */
export function buildReplyQuotePreviewHtml(
  source: ReplyQuotePreviewSource,
  mode: MailReplyQuoteMode,
  draftHtml?: string,
): string {
  const plain = buildReplyQuotePreview(source, mode);
  if (!plain.trim()) {
    return draftHtml?.trim() ?? "";
  }
  const quotedHtml = plain
    .split("\n")
    .map((line) => escapeHtml(line))
    .join("<br/>");
  const draftBlock = draftHtml?.trim()
    ? `<div class="mail-reply-draft">${draftHtml}</div>`
    : "";
  return `${draftBlock}<blockquote class="mail-reply-quote-block" style="margin:12px 0 0;padding:8px 12px;border-left:3px solid #94a3b8;color:#475569;font-family:system-ui,sans-serif;font-size:14px;line-height:1.45">${quotedHtml}</blockquote>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
