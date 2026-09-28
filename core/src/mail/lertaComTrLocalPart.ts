/** Paylaşımlı tenant: `localPart@lerta.com.tr` */

const TR_ASCII: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  Ç: "c",
  Ğ: "g",
  İ: "i",
  I: "i",
  Ö: "o",
  Ş: "s",
  Ü: "u",
};

const LEGAL_SUFFIX_PATTERN =
  /\b(a\.?\s*s\.?|anonim|şirketi|sirketi|limited|ltd\.?\s*şti\.?|ltd\.?\s*sti\.?|şti\.?|sti\.?|san\.?|tic\.?|ve|lojistik|logistics|nakliyat|nakliye|taşımacılık|tasimacilik|transport|kargo|holding|group|grup)\b/gi;

export const RESERVED_LERTA_COM_TR_LOCAL_PARTS = new Set([
  "admin",
  "administrator",
  "postmaster",
  "hostmaster",
  "abuse",
  "noreply",
  "no-reply",
  "mail",
  "mailer-daemon",
  "root",
  "support",
  "help",
  "info",
  "sales",
  "billing",
  "dmarc",
  "notifications",
  "security",
  "webmaster",
  "www",
  "ftp",
  "smtp",
  "imap",
  "test",
  "demo",
  "null",
  "lerta",
  "posta",
]);

export function transliterateTurkishToAscii(input: string): string {
  let out = "";
  for (const ch of input) {
    out += TR_ASCII[ch] ?? ch;
  }
  return out;
}

export function isValidLertaComTrLocalPart(localPart: string): boolean {
  const normalized = localPart.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 50) {
    return false;
  }
  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(normalized)) {
    return false;
  }
  if (RESERVED_LERTA_COM_TR_LOCAL_PARTS.has(normalized)) {
    return false;
  }
  return true;
}

/** Firma unvanından tek öneri (kompakt, tire yok). */
export function suggestLertaComTrLocalPartFromLegalName(
  companyLegalName: string,
): string {
  let base = transliterateTurkishToAscii(companyLegalName.trim().toLowerCase());
  base = base.replace(LEGAL_SUFFIX_PATTERN, " ");
  base = base.replace(/[^a-z0-9]+/g, "");
  if (base.length < 3) {
    base = transliterateTurkishToAscii(companyLegalName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }
  base = base.slice(0, 48);
  if (base.length < 3) {
    return "firma";
  }
  if (RESERVED_LERTA_COM_TR_LOCAL_PARTS.has(base)) {
    return `${base}1`.slice(0, 48);
  }
  return base;
}

/** Birincil öneri + alternatifler (tireli / numaralı). */
export function buildLertaComTrLocalPartCandidates(
  companyLegalName: string,
  max = 5,
): string[] {
  const primary = suggestLertaComTrLocalPartFromLegalName(companyLegalName);
  const words = transliterateTurkishToAscii(companyLegalName.trim().toLowerCase())
    .replace(LEGAL_SUFFIX_PATTERN, " ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2)
    .slice(0, 4);
  const hyphenated = words.join("-").slice(0, 48);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const candidate of [
    primary,
    hyphenated,
    `${primary}1`,
    `${primary}2`,
    words.length >= 2 ? `${words[0]}-${words[1]}`.slice(0, 48) : "",
  ]) {
    const c = candidate.trim().toLowerCase();
    if (!c || seen.has(c) || !isValidLertaComTrLocalPart(c)) {
      continue;
    }
    seen.add(c);
    out.push(c);
    if (out.length >= max) {
      break;
    }
  }
  if (out.length === 0 && isValidLertaComTrLocalPart(primary)) {
    out.push(primary);
  }
  return out;
}
