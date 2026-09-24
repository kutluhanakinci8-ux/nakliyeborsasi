/** Public product name (title case). */
export const PLATFORM_PRODUCT_NAME = "Lerta Logistics";

/** Uppercase styling for headers and email mastheads. */
export const PLATFORM_PRODUCT_NAME_UPPER = "LERTA LOGISTICS";

export const PLATFORM_MONOGRAM = "LL";

/** Public contact and default notification From domain (Faz A). */
export const PLATFORM_PRIMARY_CONTACT_EMAIL = "notifications@mail.lerta.tr";

/** Platform `/admin` operator login (seed owner). */
export const PLATFORM_OPERATOR_EMAIL = "admin@lerta.tr";

/** Yalnızca platform operatörü e-postaları `/admin` konsoluna erişebilir. */
export function isPlatformOperatorEmail(emailAddress: string): boolean {
  const normalized = emailAddress.trim().toLowerCase();
  const allowed = new Set([
    PLATFORM_OPERATOR_EMAIL.toLowerCase(),
    PLATFORM_PRIMARY_CONTACT_EMAIL.toLowerCase(),
  ]);
  return allowed.has(normalized);
}

export const PLATFORM_EMAIL_SUBJECT_TAG = "Lerta";

export const PLATFORM_DEFAULT_SMTP_FROM = `${PLATFORM_PRODUCT_NAME} <${PLATFORM_PRIMARY_CONTACT_EMAIL}>`;

export const PLATFORM_HTTP_USER_AGENT_ENRICHMENT =
  "LertaLogistics-CompanyEnrichment/1.0 (+mailto:admin@lerta.tr)";
