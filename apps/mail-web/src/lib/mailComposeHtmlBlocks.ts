/** E-posta istemcileri için tablo tabanlı HTML blokları (zengin editör). */

export function composeDividerBlock(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td style="border-top:1px solid #e2e5ec;font-size:0;line-height:0;">&nbsp;</td></tr></table><p><br></p>`;
}

export function composeCtaButtonBlock(label = "Detayları görüntüle", href = "https://posta.lerta.com.tr"): string {
  const safeLabel = label.replace(/</g, "&lt;");
  const safeHref = href.replace(/"/g, "&quot;");
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0;"><tr><td style="border-radius:10px;background-color:#4f46e5;"><a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${safeLabel}</a></td></tr></table><p><br></p>`;
}

export function composeHeroBlock(title = "Başlık", subtitle = "Alt satır metni"): string {
  const t = title.replace(/</g, "&lt;");
  const s = subtitle.replace(/</g, "&lt;");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border-radius:12px;overflow:hidden;"><tr><td style="background-color:#1a1647;padding:22px 24px;"><p style="margin:0;font-size:22px;font-weight:700;line-height:1.25;color:#ffffff;">${t}</p><p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:rgba(255,255,255,0.9);">${s}</p></td></tr></table><p><br></p>`;
}

export function composeTwoColumnBlock(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;"><tr><td width="48%" valign="top" style="padding-right:12px;font-size:15px;line-height:1.6;color:#14151f;"><p style="margin:0;">Sol sütun</p></td><td width="4%">&nbsp;</td><td width="48%" valign="top" style="padding-left:12px;font-size:15px;line-height:1.6;color:#14151f;"><p style="margin:0;">Sağ sütun</p></td></tr></table><p><br></p>`;
}

export function composeImageBlock(url: string, alt = "Görsel"): string {
  const safeUrl = url.replace(/"/g, "&quot;");
  const safeAlt = alt.replace(/</g, "&lt;");
  return `<p style="margin:16px 0;"><img src="${safeUrl}" alt="${safeAlt}" width="560" style="display:block;max-width:100%;height:auto;border-radius:8px;" /></p><p><br></p>`;
}

export const MERGE_FIELD_TOKENS = [
  { token: "{{musteri_adi}}", label: "Müşteri adı" },
  { token: "{{referans}}", label: "Referans" },
  { token: "{{firma_adi}}", label: "Firma adı" },
  { token: "{{bugun}}", label: "Bugünün tarihi" },
  { token: "{{gonderen_ad}}", label: "Gönderen adı" },
] as const;
