import { escapeHtml } from "./MailOutboundHtmlEscape";

export function buildOutboundDividerHtml(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;">
<tr><td style="border-top:1px solid #e2e5ec;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>`;
}

export function buildOutboundHeroHtml(params: {
  title: string;
  subtitle?: string;
  accentColor?: string;
}): string {
  const title = escapeHtml(params.title.trim());
  const subtitle = params.subtitle?.trim()
    ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:rgba(255,255,255,0.9);">${escapeHtml(params.subtitle.trim())}</p>`
    : "";
  const bg = params.accentColor?.trim() || "#1a1647";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border-radius:12px;overflow:hidden;">
<tr>
<td style="background-color:${escapeHtml(bg)};padding:22px 24px;">
<p style="margin:0;font-size:22px;font-weight:700;line-height:1.25;color:#ffffff;">${title}</p>
${subtitle}
</td>
</tr>
</table>`;
}

export function buildOutboundTwoColumnHtml(params: {
  leftHtml: string;
  rightHtml: string;
}): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;">
<tr>
<td width="48%" valign="top" style="padding-right:12px;font-size:15px;line-height:1.6;color:#14151f;">${params.leftHtml}</td>
<td width="4%">&nbsp;</td>
<td width="48%" valign="top" style="padding-left:12px;font-size:15px;line-height:1.6;color:#14151f;">${params.rightHtml}</td>
</tr>
</table>`;
}

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
