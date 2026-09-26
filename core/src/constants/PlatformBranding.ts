/** Public product name (title case). */
export const PLATFORM_PRODUCT_NAME = "Lerta Logistics";

/** Uppercase styling for headers and email mastheads. */
export const PLATFORM_PRODUCT_NAME_UPPER = "LERTA LOGISTICS";

export const PLATFORM_MONOGRAM = "LL";

/** Public contact and default notification From domain (Faz A). */
export const PLATFORM_PRIMARY_CONTACT_EMAIL = "notifications@mail.lerta.tr";

/** Nakliye borsası (lerta.tr) paylaşımlı pilot — Mail SaaS için `MAIL_PLATFORM_TENANT_DOMAIN` kullanın. */
export const PLATFORM_TENANT_MAIL_DOMAIN = "kullanici.lerta.tr";

/**
 * Lerta Mail SaaS — müşteri pilot/kurulum adresi (ör. `karagoz@lerta.com.tr`).
 * DNS tek sefer platformda; müşteri `kullanici.*` alt alanı görmez.
 */
export const PLATFORM_MAIL_SAAS_TENANT_DOMAIN = "lerta.com.tr";

/**
 * Otomatik DNS — markalı kutu: `info@abayer.box` → teknik `info@abayer.box.lerta.com.tr`.
 * İsimtescil: wildcard MX `*.box.lerta.com.tr` (tek sefer, platform).
 */
export const PLATFORM_MAIL_INSTANT_BOX_LABEL = "box";
export const PLATFORM_MAIL_INSTANT_BOX_ZONE = "box.lerta.com.tr";

export function instantBoxFqdnForOrgSlug(orgSlug: string): string {
  const slug = orgSlug.trim().toLowerCase();
  return `${slug}.${PLATFORM_MAIL_INSTANT_BOX_ZONE}`;
}

/** `info@abayer.box` biçimini ayrıştırır; tam FQDN değilse null. */
export function parseInstantBoxVanityEmail(
  raw: string,
): { localPart: string; orgSlug: string; fqdn: string } | null {
  const trimmed = raw.trim().toLowerCase();
  const vanityPattern = /^([a-z0-9][a-z0-9._-]{1,48}[a-z0-9])@([a-z0-9][a-z0-9-]{1,48}[a-z0-9])\.box$/;
  const match = trimmed.match(vanityPattern);
  if (!match) {
    return null;
  }
  const orgSlug = match[2];
  return {
    localPart: match[1],
    orgSlug,
    fqdn: instantBoxFqdnForOrgSlug(orgSlug),
  };
}

export function formatInstantBoxVanityEmail(
  localPart: string,
  orgSlug: string,
): string {
  return `${localPart.trim().toLowerCase()}@${orgSlug.trim().toLowerCase()}.${PLATFORM_MAIL_INSTANT_BOX_LABEL}`;
}

export function isInstantBoxMailDomain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase().replace(/\.$/, "");
  return (
    normalized === PLATFORM_MAIL_INSTANT_BOX_ZONE ||
    normalized.endsWith(`.${PLATFORM_MAIL_INSTANT_BOX_ZONE}`)
  );
}

/** Özel domain olarak eklenemeyen Lerta Mail SaaS alanları. */
export function isReservedLertaMailSaasDomain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase().replace(/\.$/, "");
  if (
    normalized === "lerta.tr" ||
    normalized.endsWith(".lerta.tr") ||
    normalized === PLATFORM_TENANT_MAIL_DOMAIN ||
    normalized.endsWith(`.${PLATFORM_TENANT_MAIL_DOMAIN}`)
  ) {
    return true;
  }
  if (
    normalized === PLATFORM_MAIL_SAAS_TENANT_DOMAIN ||
    normalized.endsWith(".lerta.com.tr")
  ) {
    return true;
  }
  if (normalized === "kullanici.lerta.com.tr") {
    return true;
  }
  if (isInstantBoxMailDomain(normalized)) {
    return true;
  }
  return false;
}

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
