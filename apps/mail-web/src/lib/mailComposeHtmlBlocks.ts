/** E-posta istemcileri için tablo tabanlı HTML blokları (zengin editör). */

const DEFAULT_ACCENT = "#1a1647";
const DEFAULT_CTA = "#4f46e5";

export function normalizeBrandAccentColor(color: string | null | undefined): string {
  const trimmed = color?.trim() ?? "";
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed;
  }
  return DEFAULT_ACCENT;
}

export function composeDividerBlock(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr><td style="border-top:1px solid #e2e5ec;font-size:0;line-height:0;">&nbsp;</td></tr></table><p><br></p>`;
}

export function composeCtaButtonBlock(
  label = "Detayları görüntüle",
  href = "https://posta.lerta.com.tr",
  accentColor?: string | null,
): string {
  const safeLabel = label.replace(/</g, "&lt;");
  const safeHref = href.replace(/"/g, "&quot;");
  const bg = normalizeBrandAccentColor(accentColor ?? DEFAULT_CTA);
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0;"><tr><td style="border-radius:10px;background-color:${bg};"><a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${safeLabel}</a></td></tr></table><p><br></p>`;
}

export function composeHeroBlock(
  title = "Başlık",
  subtitle = "Alt satır metni",
  accentColor?: string | null,
): string {
  const t = title.replace(/</g, "&lt;");
  const s = subtitle.replace(/</g, "&lt;");
  const bg = normalizeBrandAccentColor(accentColor);
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border-radius:12px;overflow:hidden;"><tr><td style="background-color:${bg};padding:22px 24px;"><p style="margin:0;font-size:22px;font-weight:700;line-height:1.25;color:#ffffff;">${t}</p><p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:rgba(255,255,255,0.9);">${s}</p></td></tr></table><p><br></p>`;
}

export function composeTwoColumnBlock(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;"><tr><td width="48%" valign="top" style="padding-right:12px;font-size:15px;line-height:1.6;color:#14151f;"><p style="margin:0;">Sol sütun</p></td><td width="4%">&nbsp;</td><td width="48%" valign="top" style="padding-left:12px;font-size:15px;line-height:1.6;color:#14151f;"><p style="margin:0;">Sağ sütun</p></td></tr></table><p><br></p>`;
}

export function composeCalloutBlock(
  body = "Önemli bilgi veya uyarı metni.",
  variant: "info" | "success" | "warning" = "info",
): string {
  const safe = body.replace(/</g, "&lt;");
  const palette =
    variant === "success"
      ? { bg: "#ecfdf5", border: "#059669", text: "#064e3b" }
      : variant === "warning"
        ? { bg: "#fffbeb", border: "#d97706", text: "#78350f" }
        : { bg: "#f0f9ff", border: "#2563eb", text: "#0f172a" };
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;"><tr><td style="background-color:${palette.bg};border-left:4px solid ${palette.border};padding:14px 16px;border-radius:8px;font-size:15px;line-height:1.55;color:${palette.text};">${safe}</td></tr></table><p><br></p>`;
}

export function composeQuoteBlock(quote = "Alıntı metni", author = ""): string {
  const q = quote.replace(/</g, "&lt;");
  const a = author.replace(/</g, "&lt;");
  const byline = a
    ? `<p style="margin:8px 0 0;font-size:13px;color:#64748b;">— ${a}</p>`
    : "";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;"><tr><td style="border-left:3px solid #cbd5e1;padding:8px 16px;font-size:16px;line-height:1.55;color:#334155;font-style:italic;">${q}${byline}</td></tr></table><p><br></p>`;
}

export function composeLogoHeaderBlock(
  logoUrl: string,
  title: string,
  accentColor?: string | null,
): string {
  const safeUrl = logoUrl.replace(/"/g, "&quot;");
  const safeTitle = title.replace(/</g, "&lt;");
  const border = normalizeBrandAccentColor(accentColor);
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;border-bottom:3px solid ${border};"><tr><td style="padding:12px 0;"><img src="${safeUrl}" alt="" height="40" style="display:block;max-height:40px;width:auto;margin-bottom:8px;" /><p style="margin:0;font-size:18px;font-weight:700;color:#14151f;">${safeTitle}</p></td></tr></table><p><br></p>`;
}

export function composeLegalFooterBlock(text: string): string {
  const safe = text.replace(/</g, "&lt;");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0;"><tr><td style="font-size:12px;line-height:1.5;color:#64748b;border-top:1px solid #e2e5ec;padding-top:12px;">${safe}</td></tr></table><p><br></p>`;
}

export function composeFeatureRowBlock(
  title = "Özellik",
  body = "Kısa açıklama",
): string {
  const t = title.replace(/</g, "&lt;");
  const b = body.replace(/</g, "&lt;");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0;"><tr><td width="36" valign="top" style="font-size:22px;line-height:1;">✓</td><td valign="top" style="font-size:15px;line-height:1.55;color:#14151f;"><p style="margin:0;font-weight:700;">${t}</p><p style="margin:4px 0 0;color:#475569;">${b}</p></td></tr></table><p><br></p>`;
}

export function composeImageBlock(url: string, alt = "Görsel"): string {
  const safeUrl = url.replace(/"/g, "&quot;");
  const safeAlt = alt.replace(/</g, "&lt;");
  return `<p style="margin:16px 0;"><img src="${safeUrl}" alt="${safeAlt}" width="560" style="display:block;max-width:100%;height:auto;border-radius:8px;" /></p><p><br></p>`;
}

export type ComposeHtmlBlockId =
  | "divider"
  | "cta"
  | "hero"
  | "columns"
  | "callout"
  | "callout-success"
  | "callout-warning"
  | "quote"
  | "feature"
  | "logo-header"
  | "legal-footer"
  | "image";

export const COMPOSE_HTML_BLOCK_CATALOG: {
  id: ComposeHtmlBlockId;
  label: string;
  group: "kurumsal" | "içerik" | "görsel";
}[] = [
  { id: "hero", label: "Hero başlık", group: "kurumsal" },
  { id: "logo-header", label: "Logo üst bilgi", group: "kurumsal" },
  { id: "cta", label: "CTA düğme", group: "kurumsal" },
  { id: "legal-footer", label: "Yasal dipnot", group: "kurumsal" },
  { id: "divider", label: "Ayırıcı", group: "içerik" },
  { id: "columns", label: "İki sütun", group: "içerik" },
  { id: "callout", label: "Bilgi kutusu", group: "içerik" },
  { id: "callout-success", label: "Başarı kutusu", group: "içerik" },
  { id: "callout-warning", label: "Uyarı kutusu", group: "içerik" },
  { id: "quote", label: "Alıntı", group: "içerik" },
  { id: "feature", label: "Özellik satırı", group: "içerik" },
  { id: "image", label: "Görsel (URL)", group: "görsel" },
];

export const MERGE_FIELD_TOKENS = [
  { token: "{{musteri_adi}}", label: "Müşteri adı" },
  { token: "{{referans}}", label: "Referans" },
  { token: "{{firma_adi}}", label: "Firma adı" },
  { token: "{{bugun}}", label: "Bugünün tarihi" },
  { token: "{{gonderen_ad}}", label: "Gönderen adı" },
] as const;
