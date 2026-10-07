import type { MailOrganizationBrandingSnapshot } from "./MailOrganizationBrandingService";

export function isEkolojikMarketMailboxAddress(
  primaryAddress: string | null | undefined,
): boolean {
  const addr = primaryAddress?.trim().toLowerCase() ?? "";
  if (!addr.includes("@")) {
    return false;
  }
  return (
    addr.endsWith("@ekolojikmarket.com.tr") ||
    addr.endsWith("@ekolojikmarket.com") ||
    addr.includes("@posta.ekolojikmarket.com.tr") ||
    addr.includes(".ekolojikmarket.com.tr")
  );
}

/** Ekolojik tenant webmail: Lerta chrome yerine Market markası. */
export function applyEkolojikMarketWebmailBranding(
  branding: MailOrganizationBrandingSnapshot,
  primaryAddress: string | null,
): MailOrganizationBrandingSnapshot {
  if (!isEkolojikMarketMailboxAddress(primaryAddress)) {
    return branding;
  }
  const title = branding.emailBrandTitle?.trim() || "Ekolojik Posta";
  return {
    ...branding,
    allowed: true,
    emailBrandTitle: title,
    hidePlatformEmailChrome: true,
    detailTr: "Ekolojik Market kurumsal posta (tenant white-label).",
  };
}
