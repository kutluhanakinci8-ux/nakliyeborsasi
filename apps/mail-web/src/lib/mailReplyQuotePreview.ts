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
