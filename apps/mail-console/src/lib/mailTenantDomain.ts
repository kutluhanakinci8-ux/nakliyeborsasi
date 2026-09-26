/** Lerta Mail SaaS — müşteri pilot kutuları (DNS platformda). */
export const MAIL_SAAS_TENANT_DOMAIN = "lerta.com.tr";

export function formatTenantMailbox(localPart: string): string {
  return `${localPart.trim().toLowerCase()}@${MAIL_SAAS_TENANT_DOMAIN}`;
}
