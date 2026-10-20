/** Paylaşımlı pilot tenant (ör. kutluhan@lerta.com.tr). */
export const MAIL_PILOT_TENANT_DOMAIN = "lerta.com.tr";

const PILOT_LOCAL_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

/** Eski .post vanity — artık API tarafında kapalı. */
const LERTA_POST_VANITY_RE =
  /^([a-z0-9][a-z0-9._-]{1,48}[a-z0-9])@([a-z0-9][a-z0-9-]{1,48}[a-z0-9])\.post$/;

export function parseLertaPilotMailboxAddress(
  raw: string,
): { localPart: string; full: string } | null {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.endsWith(".post") || LERTA_POST_VANITY_RE.test(trimmed)) {
    return null;
  }
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) {
    return null;
  }
  const localPart = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (domain !== MAIL_PILOT_TENANT_DOMAIN) {
    return null;
  }
  if (!PILOT_LOCAL_RE.test(localPart)) {
    return null;
  }
  return { localPart, full: trimmed };
}

/** @deprecated .post kapatıldı — parseLertaPilotMailboxAddress kullanın. */
export function parseLertaPostDesiredAddress(
  raw: string,
): { localPart: string; orgSlug: string; full: string } | null {
  const pilot = parseLertaPilotMailboxAddress(raw);
  if (pilot) {
    return {
      localPart: pilot.localPart,
      orgSlug: MAIL_PILOT_TENANT_DOMAIN,
      full: pilot.full,
    };
  }
  const trimmed = raw.trim().toLowerCase();
  const match = trimmed.match(LERTA_POST_VANITY_RE);
  if (!match) {
    return null;
  }
  return {
    localPart: match[1],
    orgSlug: match[2],
    full: trimmed,
  };
}

export function slugFromCompanyLegalName(legalName: string): string | null {
  const slug = legalName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  if (!PILOT_LOCAL_RE.test(slug)) {
    return null;
  }
  return slug;
}

export function suggestLertaPilotFromCompany(legalName: string): string | null {
  const slug = slugFromCompanyLegalName(legalName);
  if (!slug) {
    return null;
  }
  return `${slug}@${MAIL_PILOT_TENANT_DOMAIN}`;
}

/** @deprecated */
export function suggestLertaPostFromCompany(
  legalName: string,
  localPart = "info",
): string | null {
  return suggestLertaPilotFromCompany(legalName) ?? null;
}

/** @deprecated */
export function suggestLertaPostMailbox(
  customDomain: string | null,
  localPart = "info",
): string | null {
  if (!customDomain?.trim()) {
    return null;
  }
  const host = customDomain.trim().toLowerCase().replace(/\.$/, "");
  const slug = host.split(".")[0];
  if (!PILOT_LOCAL_RE.test(slug)) {
    return null;
  }
  const part = localPart.trim().toLowerCase();
  if (!PILOT_LOCAL_RE.test(part)) {
    return null;
  }
  return `${part}@${MAIL_PILOT_TENANT_DOMAIN}`;
}
