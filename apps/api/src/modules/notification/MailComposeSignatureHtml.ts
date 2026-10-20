import { sanitizeOutboundHtml } from "./MailOutboundHtmlTemplate";

export const LERTA_SIGNATURE_BLOCK_MARKER = "lerta-signature-block";

export type OutboundSignatureInput = {
  bodyText: string;
  bodyHtml?: string | null;
};

export function signatureAlreadyInPlainBody(
  bodyText: string,
  signatureText: string,
): boolean {
  const body = bodyText.replace(/\r\n/g, "\n").trimEnd();
  const sig = signatureText.replace(/\r\n/g, "\n").trim();
  if (!sig) {
    return true;
  }
  return body.endsWith(sig) || body.includes(`\n\n${sig}`);
}

export function buildOutboundSignatureHtml(
  signature: OutboundSignatureInput,
): string {
  const marker = `<!-- ${LERTA_SIGNATURE_BLOCK_MARKER} -->`;
  const raw = signature.bodyHtml?.trim();
  if (raw) {
    return `${marker}<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e5ec;">${sanitizeOutboundHtml(raw)}</div>`;
  }
  return `${marker}${plainSignatureLinesToHtml(signature.bodyText)}`;
}

function plainSignatureLinesToHtml(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").trim().split("\n");
  if (lines.length === 0) {
    return "";
  }
  const inner = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return "<br/>";
      }
      const escaped = escapeHtml(trimmed);
      if (/^https?:\/\//i.test(trimmed)) {
        return `<a href="${escapeHtml(trimmed)}" style="color:#4f46e5;text-decoration:none;">${escaped}</a><br/>`;
      }
      if (trimmed.includes("@") && !trimmed.includes(" ")) {
        return `<a href="mailto:${escapeHtml(trimmed)}" style="color:#4f46e5;text-decoration:none;">${escaped}</a><br/>`;
      }
      return `<span style="font-size:14px;line-height:1.5;color:#5c6370;">${escaped}</span><br/>`;
    })
    .join("");
  return `<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e5ec;">${inner}</div>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
