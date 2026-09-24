import {
  PLATFORM_MONOGRAM,
  PLATFORM_PRIMARY_CONTACT_EMAIL,
  PLATFORM_PRODUCT_NAME,
  PLATFORM_PRODUCT_NAME_UPPER,
} from "@nakliyeborsasi/core";

/** Kurumsal palet — web ile uyumlu */
const COLORS = {
  navy: "#0f2444",
  navyMid: "#1e3a5f",
  teal: "#0d9488",
  tealLight: "#14b8a6",
  slate: "#64748b",
  slateLight: "#94a3b8",
  border: "#e2e8f0",
  bg: "#f1f5f9",
  white: "#ffffff",
  gold: "#c9a227",
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatOccurredAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Istanbul",
    });
  } catch {
    return iso;
  }
}

export function detailTable(rows: { label: string; value: string }[]): string {
  const cells = rows
    .map(
      (row) => `
      <tr>
        <td style="padding:10px 12px;color:${COLORS.slate};font-size:13px;width:38%;vertical-align:top;border-bottom:1px solid ${COLORS.border};">${escapeHtml(row.label)}</td>
        <td style="padding:10px 12px;color:${COLORS.navy};font-size:14px;font-weight:500;vertical-align:top;border-bottom:1px solid ${COLORS.border};">${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join("");
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:20px 0 8px;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden;">
      ${cells}
    </table>`;
}

export function primaryButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
      <tr>
        <td style="border-radius:8px;background:linear-gradient(135deg,${COLORS.tealLight},${COLORS.teal});">
          <a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;color:${COLORS.white};text-decoration:none;letter-spacing:0.02em;">${safeLabel}</a>
        </td>
      </tr>
    </table>`;
}

export function leadParagraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${COLORS.navy};">${text}</p>`;
}

export function mutedParagraph(text: string): string {
  return `<p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:${COLORS.slate};">${text}</p>`;
}

type WrapOptions = {
  eyebrow?: string;
  preheader?: string;
  badge?: string;
};

export function wrapCorporateEmail(
  title: string,
  bodyHtml: string,
  options: WrapOptions = {},
): string {
  const eyebrow = options.eyebrow ?? "Operasyon bildirimi";
  const preheader = escapeHtml(
    options.preheader ?? `${PLATFORM_PRODUCT_NAME} — ${title}`,
  );
  const badge = options.badge ?? "TR · UA · EU koridoru";

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:'Segoe UI',system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${COLORS.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;border-collapse:separate;">
          <tr>
            <td style="background:linear-gradient(135deg,${COLORS.navy} 0%,${COLORS.navyMid} 55%,#0f4c7a 100%);border-radius:14px 14px 0 0;padding:28px 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="52" valign="middle">
                    <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);text-align:center;line-height:48px;font-size:16px;font-weight:800;color:${COLORS.white};letter-spacing:-0.02em;">${PLATFORM_MONOGRAM}</div>
                  </td>
                  <td valign="middle" style="padding-left:14px;">
                    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${COLORS.tealLight};">${PLATFORM_PRODUCT_NAME_UPPER}</p>
                    <p style="margin:4px 0 0;font-size:18px;font-weight:600;color:${COLORS.white};letter-spacing:-0.02em;">${PLATFORM_PRODUCT_NAME}</p>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;padding:6px 10px;border-radius:999px;font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.9);background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);">${escapeHtml(badge)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:${COLORS.white};padding:32px 32px 28px;border-left:1px solid ${COLORS.border};border-right:1px solid ${COLORS.border};">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${COLORS.teal};">${escapeHtml(eyebrow)}</p>
              <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;line-height:1.3;color:${COLORS.navy};letter-spacing:-0.03em;">${escapeHtml(title)}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:22px 32px 28px;border:1px solid ${COLORS.border};border-top:none;border-radius:0 0 14px 14px;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${COLORS.slate};">
                Bu mesaj <strong style="color:${COLORS.navy};">${PLATFORM_PRODUCT_NAME}</strong> platformundan otomatik gönderilmiştir.
              </p>
              <p style="margin:0;font-size:12px;color:${COLORS.slateLight};">
                İletişim: <a href="mailto:${PLATFORM_PRIMARY_CONTACT_EMAIL}" style="color:${COLORS.teal};text-decoration:none;">${PLATFORM_PRIMARY_CONTACT_EMAIL}</a>
              </p>
              <p style="margin:14px 0 0;font-size:10px;color:${COLORS.slateLight};letter-spacing:0.04em;">© ${new Date().getFullYear()} ${PLATFORM_PRODUCT_NAME}. Tüm hakları saklıdır.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
