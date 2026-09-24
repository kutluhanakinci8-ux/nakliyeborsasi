/** Public product name (title case). */
export const PLATFORM_PRODUCT_NAME = "Lerta Logistics";

/** Uppercase styling for headers and email mastheads. */
export const PLATFORM_PRODUCT_NAME_UPPER = "LERTA LOGISTICS";

export const PLATFORM_MONOGRAM = "LL";

/** Primary business inbox (operations, admin notifications, public contact). */
export const PLATFORM_PRIMARY_CONTACT_EMAIL = "lertalogistics@gmail.com";

/** Yalnızca platform sahibi e-postası `/admin` konsoluna erişebilir. */
export function isPlatformOperatorEmail(emailAddress: string): boolean {
  return (
    emailAddress.trim().toLowerCase() ===
    PLATFORM_PRIMARY_CONTACT_EMAIL.toLowerCase()
  );
}

export const PLATFORM_EMAIL_SUBJECT_TAG = "Lerta";

export const PLATFORM_DEFAULT_SMTP_FROM = `${PLATFORM_PRODUCT_NAME} <${PLATFORM_PRIMARY_CONTACT_EMAIL}>`;

export const PLATFORM_HTTP_USER_AGENT_ENRICHMENT =
  "LertaLogistics-CompanyEnrichment/1.0 (+mailto:lertalogistics@gmail.com)";
