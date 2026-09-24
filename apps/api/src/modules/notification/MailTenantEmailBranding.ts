import { PLATFORM_OPERATOR_EMAIL, PLATFORM_PRODUCT_NAME } from "@nakliyeborsasi/core";

export function resolveTenantReplyToAddress(): string {
  return process.env.MAIL_PLATFORM_REPLY_TO?.trim() || PLATFORM_OPERATOR_EMAIL;
}

export function appendTenantTrustFooter(
  html: string,
  params: { organizationName: string; fromAddress: string },
): string {
  const org = params.organizationName.trim() || "Kurumsal hesap";
  const from = params.fromAddress.trim();
  const footer = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
  <tr>
    <td style="padding:16px 20px;border-radius:10px;background:#f1f5f9;border:1px solid #e2e8f0;font-size:12px;line-height:1.55;color:#475569;">
      Bu e-posta <strong>${escapeHtml(org)}</strong> adına ${PLATFORM_PRODUCT_NAME} platformu üzerinden gönderilmiştir.
      Gönderen: <code style="font-size:11px;">${escapeHtml(from)}</code>.
      Yanıtlarınız platform destek hattına yönlendirilir.
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
