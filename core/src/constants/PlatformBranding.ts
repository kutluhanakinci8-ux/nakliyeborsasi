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
 * Lerta Post — sıfır müşteri DNS: `{localPart}@{firma}.post` (ör. `info@abayer.post`).
 * Teknik FQDN: `info@abayer.post.lerta.com.tr` · wildcard MX `*.post.lerta.com.tr`.
 */
export const PLATFORM_MAIL_INSTANT_POST_LABEL = "post";
export const PLATFORM_MAIL_INSTANT_POST_ZONE = "post.lerta.com.tr";

export function instantPostFqdnForOrgSlug(orgSlug: string): string {
  const slug = orgSlug.trim().toLowerCase();
  return `${slug}.${PLATFORM_MAIL_INSTANT_POST_ZONE}`;
}

/**
 * Vanity adres: local-part + firma slug + `.post` (local-part: info, satis, ahmet, …).
 */
export function parseInstantPostVanityEmail(
  raw: string,
): { localPart: string; orgSlug: string; fqdn: string } | null {
  const trimmed = raw.trim().toLowerCase();
  const label = PLATFORM_MAIL_INSTANT_POST_LABEL;
  const vanityPattern = new RegExp(
    `^([a-z0-9][a-z0-9._-]{1,48}[a-z0-9])@([a-z0-9][a-z0-9-]{1,48}[a-z0-9])\\.${label}$`,
  );
  const match = trimmed.match(vanityPattern);
  if (!match) {
    return null;
  }
  const orgSlug = match[2];
  return {
    localPart: match[1],
    orgSlug,
    fqdn: instantPostFqdnForOrgSlug(orgSlug),
  };
}

export function formatInstantPostVanityEmail(
  localPart: string,
  orgSlug: string,
): string {
  return `${localPart.trim().toLowerCase()}@${orgSlug.trim().toLowerCase()}.${PLATFORM_MAIL_INSTANT_POST_LABEL}`;
}

export function isInstantPostMailDomain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase().replace(/\.$/, "");
  return (
    normalized === PLATFORM_MAIL_INSTANT_POST_ZONE ||
    normalized.endsWith(`.${PLATFORM_MAIL_INSTANT_POST_ZONE}`)
  );
}

export function instantPostOrgSlugFromMailDomain(domain: string): string | null {
  const normalized = domain.trim().toLowerCase();
  const suffix = `.${PLATFORM_MAIL_INSTANT_POST_ZONE}`;
  if (!normalized.endsWith(suffix)) {
    return null;
  }
  const slug = normalized.slice(0, -suffix.length);
  return slug.length > 0 ? slug : null;
}

/** Müşteriye gösterilen / From başlığı vs SMTP kimliği (Lerta Post). */
export function resolveMailSenderAddresses(
  localPart: string,
  mailDomain: { domain: string; domainType: string },
): { publicAddress: string; technicalAddress: string } {
  const technicalAddress =
    `${localPart.trim().toLowerCase()}@${mailDomain.domain.trim().toLowerCase()}`;
  if (
    mailDomain.domainType === "instant_post" ||
    mailDomain.domainType === "instant_box"
  ) {
    const slug = instantPostOrgSlugFromMailDomain(mailDomain.domain);
    if (slug) {
      return {
        publicAddress: formatInstantPostVanityEmail(localPart, slug),
        technicalAddress,
      };
    }
  }
  return { publicAddress: technicalAddress, technicalAddress };
}

export function formatMailFromHeader(
  emailAddress: string,
  displayName?: string | null,
): string {
  const email = emailAddress.trim();
  const name = displayName?.trim();
  return name ? `${name} <${email}>` : email;
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
  if (isInstantPostMailDomain(normalized)) {
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
