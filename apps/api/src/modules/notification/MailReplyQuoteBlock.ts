import type { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import type { MailReplyQuoteMode } from "./MailInboxPostaPreferenceValues";

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function inboundPlainBody(inbound: MailInboundMessageEntity): string {
  return (
    inbound.bodyText?.trim() ||
    stripHtml(inbound.bodyHtml ?? "") ||
    inbound.snippet ||
    ""
  );
}

/** Kurumsal yanıt alıntısı (Tam / Kısa / Yok). */
export function buildReplyQuoteBlock(
  inbound: MailInboundMessageEntity,
  mode: MailReplyQuoteMode,
): string {
  if (mode === "none") {
    return "";
  }
  const date = inbound.receivedAt.toLocaleString("tr-TR");
  let body = inboundPlainBody(inbound) || "(İçerik yok)";
  if (mode === "trimmed") {
    const max = 480;
    if (body.length > max) {
      body = `${body.slice(0, max).trim()}…`;
    }
  }
  const quotedLines = body
    .split("\n")
    .map((line) => (line.trim().length > 0 ? `> ${line}` : ">"));
  return [
    "",
    `--- ${date} tarihinde ${inbound.fromAddress} yazdı ---`,
    ...quotedLines,
  ].join("\n");
}
