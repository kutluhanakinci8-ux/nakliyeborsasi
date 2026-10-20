import { escapeHtml } from "./MailOutboundHtmlEscape";

/** Outlook uyumlu tablo tabanlı CTA butonu. */
export function buildOutboundCtaButtonHtml(params: {
  label: string;
  href: string;
  align?: "left" | "center" | "right";
}): string {
  const label = escapeHtml(params.label.trim());
  const href = escapeHtml(params.href.trim());
  const align = params.align ?? "left";
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0;">
<tr>
<td align="${align}">
<table role="presentation" cellspacing="0" cellpadding="0">
<tr>
<td style="border-radius:10px;background-color:#4f46e5;">
<a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
</td>
</tr>
</table>
</td>
</tr>
</table>`;
}
