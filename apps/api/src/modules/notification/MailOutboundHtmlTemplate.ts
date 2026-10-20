/** HTML içinde marka tanıma (body data-* Outlook tarafında HTML düşürülmesine yol açabiliyor). */
export const LERTA_POSTA_OUTBOUND_MARKER = "lerta-posta-outbound-v2";

const DEFAULT_ACCENT = "#1a1647";

import type { MailEmailSocialLink } from "./MailEmailSocialLinks";
import {
  buildEmailSocialFooterHtml,
  buildEmailSocialFooterPlain,
} from "./MailEmailSocialLinks";

export type OutboundWrapBranding = {
  brandTitle: string;
  logoUrl: string | null;
  accentColor: string;
  /** Enterprise: Lerta footer gizlenir. */
  hidePlatformFooter: boolean;
  /** KVKK / yasal dipnot (HTML’siz düz metin, satır içi). */
  legalFooterText?: string | null;
  /** Pazarlama / kampanya: abonelik iptali linki. */
  marketingUnsubscribeUrl?: string | null;
  socialLinks?: MailEmailSocialLink[];
};

export function isLertaBrandedOutboundHtml(html: string): boolean {
  return (
    html.includes(`<!-- ${LERTA_POSTA_OUTBOUND_MARKER} -->`) ||
    html.includes("data-lerta-posta-outbound") ||
    (html.includes("Lerta Posta") && html.includes("<!DOCTYPE html>"))
  );
}

/** Outlook mobil çoğu zaman text/plain seçer; ham metin yerine kurumsal düz metin gönderilir. */
export function buildBrandedPlainText(
  fromHeader?: string,
  userText?: string,
  branding?: OutboundWrapBranding,
): string {
  const { displayName, email } = parseFromHeader(fromHeader);
  const senderLine = displayName
    ? `${displayName}${email ? ` · ${email}` : ""}`
    : email ?? "Lerta Posta";
  const headerTitle = branding?.brandTitle?.trim() || "LERTA POSTA";
  const body = (userText ?? "").replace(/\r\n/g, "\n").trim();
  const lines = [
    "────────────────────────────",
    headerTitle.toUpperCase(),
    senderLine,
    "────────────────────────────",
    "",
    body || "(boş mesaj)",
    "",
  ];
  if (branding?.marketingUnsubscribeUrl?.trim()) {
    lines.push(
      `Abonelikten çık: ${branding.marketingUnsubscribeUrl.trim()}`,
      "",
    );
  }
  const socialPlain = buildEmailSocialFooterPlain(branding?.socialLinks ?? []);
  if (socialPlain) {
    lines.push("", socialPlain);
  }
  lines.push(
    branding?.hidePlatformFooter
      ? `— ${headerTitle}`
      : "— https://posta.lerta.com.tr",
  );
  return lines.join("\n");
}

export type OutboundHtmlContext = {
  /** From başlığı: "Ad" <ad@domain.com> */
  fromHeader?: string;
  branding?: OutboundWrapBranding;
};

export function resolveOutboundHtml(
  text: string,
  html?: string,
  context?: OutboundHtmlContext,
): string {
  if (html?.trim()) {
    return wrapLertaPostaOutboundEmail({
      bodyInnerHtml: sanitizeOutboundHtml(html.trim()),
      fromHeader: context?.fromHeader,
      branding: context?.branding,
    });
  }
  return wrapLertaPostaOutboundEmail({
    bodyInnerHtml: plainTextToOutboundBodyHtml(text),
    fromHeader: context?.fromHeader,
    branding: context?.branding,
  });
}

export function sanitizeOutboundHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

function wrapLertaPostaOutboundEmail(params: {
  bodyInnerHtml: string;
  fromHeader?: string;
  branding?: OutboundWrapBranding;
}): string {
  const { displayName, email } = parseFromHeader(params.fromHeader);
  const senderLine = displayName
    ? `${escapeHtml(displayName)}${email ? ` · ${escapeHtml(email)}` : ""}`
    : email
      ? escapeHtml(email)
      : "Lerta Posta";

  const rawTitle = params.branding?.brandTitle?.trim() || "Lerta Posta";
  const brandTitle = escapeHtml(rawTitle);
  const accent = normalizeAccentColor(params.branding?.accentColor);
  const logoUrl = params.branding?.logoUrl?.trim();
  const monogram = escapeHtml(rawTitle.charAt(0).toUpperCase() || "L");
  const titleSpan = `<span style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-0.02em;vertical-align:middle;">${brandTitle}</span>`;
  const brandRow = logoUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0"><tr>
<td style="padding-right:12px;vertical-align:middle;">
<img src="${escapeHtml(logoUrl)}" alt="${brandTitle}" width="40" height="40" style="display:block;width:40px;height:40px;max-width:40px;object-fit:contain;border-radius:8px;background:rgba(255,255,255,0.95);" />
</td>
<td style="vertical-align:middle;">${titleSpan}</td>
</tr></table>`
    : `<span style="display:inline-block;width:36px;height:36px;line-height:36px;text-align:center;border-radius:10px;background:rgba(255,255,255,0.15);color:#ffffff;font-weight:800;font-size:18px;margin-right:12px;">${escapeHtml(monogram)}</span>${titleSpan}`;

  const legal = params.branding?.legalFooterText?.trim();
  const legalBlock = legal
    ? `<p style="margin:0 0 10px;font-size:11px;line-height:1.45;color:#8b919c;text-align:center;">${escapeHtml(legal)}</p>`
    : "";
  const unsub = params.branding?.marketingUnsubscribeUrl?.trim();
  const unsubBlock = unsub
    ? `<p style="margin:0 0 10px;font-size:12px;line-height:1.5;color:#5c6370;text-align:center;"><a href="${escapeHtml(unsub)}" style="color:#4f46e5;text-decoration:underline;">Bülten aboneliğinden çık</a></p>`
    : "";
  const socialBlock = buildEmailSocialFooterHtml(
    params.branding?.socialLinks ?? [],
    accent,
  );
  const footerHtml = params.branding?.hidePlatformFooter
    ? `${legalBlock}${unsubBlock}${socialBlock}<p style="margin:0;font-size:12px;line-height:1.5;color:#5c6370;text-align:center;">${brandTitle}</p>`
    : `${legalBlock}${unsubBlock}${socialBlock}<p style="margin:0;font-size:12px;line-height:1.5;color:#5c6370;text-align:center;">
Kurumsal e-posta · <a href="https://posta.lerta.com.tr" style="color:#4f46e5;text-decoration:none;font-weight:600;">posta.lerta.com.tr</a>
</p>`;

  return `<!DOCTYPE html>
<html lang="tr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<title>${brandTitle}</title>
</head>
<!-- ${LERTA_POSTA_OUTBOUND_MARKER} -->
<body style="margin:0;padding:0;background-color:#f4f5f9;font-family:Segoe UI,system-ui,-apple-system,BlinkMacSystemFont,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f5f9;padding:32px 16px;">
<tr>
<td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e5ec;">
<tr>
<td bgcolor="${accent}" style="background-color:${accent};padding:22px 28px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td style="vertical-align:middle;">
${brandRow}
</td>
</tr>
<tr>
<td style="padding-top:10px;color:rgba(255,255,255,0.92);font-size:13px;line-height:1.45;">
${senderLine}
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:32px 28px 24px;">
${params.bodyInnerHtml}
</td>
</tr>
<tr>
<td style="padding:20px 28px 28px;border-top:1px solid #eef0f6;background-color:#fafbfc;">
${footerHtml}
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

export function plainTextToOutboundBodyHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return `<p style="margin:0;font-size:16px;line-height:1.65;color:#14151f;">&nbsp;</p>`;
  }
  const blocks = normalized.split(/\n\n+/);
  return blocks
    .map((block) => {
      if (block.includes("---------- İletilen mesaj")) {
        return `<div style="margin-top:8px;padding:16px 18px;background:#f8f9fc;border:1px solid #e2e5ec;border-left:4px solid #4f46e5;border-radius:12px;font-size:13px;line-height:1.55;color:#5c6370;white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">${escapeHtml(block)}</div>`;
      }
      const inner = block
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br/>");
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#14151f;">${inner}</p>`;
    })
    .join("");
}

function normalizeAccentColor(raw?: string | null): string {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return DEFAULT_ACCENT;
  }
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return DEFAULT_ACCENT;
}

function parseFromHeader(raw?: string): {
  displayName: string | null;
  email: string | null;
} {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return { displayName: null, email: null };
  }
  const angle = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (angle) {
    const name = angle[1].replace(/^"|"$|^'|'$/g, "").trim();
    return { displayName: name || null, email: angle[2].trim() };
  }
  if (trimmed.includes("@")) {
    return { displayName: null, email: trimmed };
  }
  return { displayName: trimmed, email: null };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
