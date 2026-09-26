const LERTA_POST_VANITY_RE =
  /^([a-z0-9][a-z0-9._-]{1,48}[a-z0-9])@([a-z0-9][a-z0-9-]{1,48}[a-z0-9])\.post$/;

export function parseLertaPostDesiredAddress(
  raw: string,
): { localPart: string; orgSlug: string; full: string } | null {
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

/** Firma ünvanından post slug (ör. "Abayer Lojistik" → abayer-lojistik). */
export function slugFromCompanyLegalName(legalName: string): string | null {
  const slug = legalName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) {
    return null;
  }
  return slug;
}

export function suggestLertaPostFromCompany(
  legalName: string,
  localPart = "info",
): string | null {
  const slug = slugFromCompanyLegalName(legalName);
  if (!slug) {
    return null;
  }
  return `${localPart.trim().toLowerCase()}@${slug}.post`;
}

/** örn. abayer.com → info@abayer.post */
export function suggestLertaPostMailbox(
  customDomain: string | null,
  localPart = "info",
): string | null {
  if (!customDomain?.trim()) {
    return null;
  }
  const host = customDomain.trim().toLowerCase().replace(/\.$/, "");
  const slug = host.split(".")[0];
  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) {
    return null;
  }
  const part = localPart.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,48}[a-z0-9]$/.test(part)) {
    return null;
  }
  return `${part}@${slug}.post`;
}
