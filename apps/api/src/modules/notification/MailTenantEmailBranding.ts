import {
  PLATFORM_MONOGRAM,
  PLATFORM_OPERATOR_EMAIL,
  PLATFORM_PRODUCT_NAME,
  PLATFORM_PRODUCT_NAME_UPPER,
} from "@nakliyeborsasi/core";

export type TenantTrustFooterMode = "platform" | "minimal";

export function resolveTenantReplyToAddress(): string {
  return process.env.MAIL_PLATFORM_REPLY_TO?.trim() || PLATFORM_OPERATOR_EMAIL;
}

export function appendTenantTrustFooter(
  html: string,
  params: {
    organizationName: string;
    fromAddress: string;
    mode?: TenantTrustFooterMode;
  },
): string {
  const org = params.organizationName.trim() || "Kurumsal hesap";
  const from = params.fromAddress.trim();
  const mode = params.mode ?? "platform";
  const body =
    mode === "minimal"
      ? `Bu e-posta <strong>${escapeHtml(org)}</strong> tarafından gönderilmiştir.
      Gönderen: <code style="font-size:11px;">${escapeHtml(from)}</code>.`
      : `Bu e-posta <strong>${escapeHtml(org)}</strong> adına ${PLATFORM_PRODUCT_NAME} platformu üzerinden gönderilmiştir.
      Gönderen: <code style="font-size:11px;">${escapeHtml(from)}</code>.
      Yanıtlarınız platform destek hattına yönlendirilir.`;
  const footer = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
  <tr>
    <td style="padding:16px 20px;border-radius:10px;background:#f1f5f9;border:1px solid #e2e8f0;font-size:12px;line-height:1.55;color:#475569;">
      ${body}
    </td>
  </tr>
</table>`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${footer}</body>`);
  }
  return `${html}${footer}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function applyEnterpriseWhiteLabelToHtml(
  html: string,
  params: {
    logoUrl: string | null;
    brandTitle: string;
    hidePlatformEmailChrome: boolean;
  },
): string {
  let next = html;
  const title = escapeHtml(params.brandTitle.trim() || PLATFORM_PRODUCT_NAME);
  const logo = params.logoUrl?.trim();

  if (logo) {
    const safeLogo = escapeHtml(logo);
    const monogramMarker = `>${escapeHtml(PLATFORM_MONOGRAM)}</div>`;
    const img = `<img src="${safeLogo}" alt="${title}" width="48" height="48" style="display:block;width:48px;height:48px;object-fit:contain;border-radius:8px;background:rgba(255,255,255,0.95);" />`;
    if (next.includes(monogramMarker)) {
      next = next.replace(monogramMarker, `>${img}</div>`);
    }
  }

  if (params.brandTitle.trim()) {
    const upper = escapeHtml(PLATFORM_PRODUCT_NAME_UPPER);
    next = next.replace(
      new RegExp(`>${upper}</p>`, "g"),
      `>${escapeHtml(params.brandTitle.trim().toUpperCase())}</p>`,
    );
    next = next.replace(
      new RegExp(`>${escapeHtml(PLATFORM_PRODUCT_NAME)}</p>`, "g"),
      `>${title}</p>`,
    );
  }

  if (params.hidePlatformEmailChrome) {
    next = next.replace(
      /Bu mesaj <strong[^>]*>[\s\S]*?Tüm hakları saklıdır\.<\/p>/,
      `<p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">${title}</p>`,
    );
    next = next.replace(
      /TR · UA · EU koridoru/g,
      "",
    );
  }

  return next;
}
