/** Kayıt ve profil formlarında kullanılan ülke listesi (ISO 3166-1 alpha-2). */
export const REGISTRATION_COUNTRY_OPTIONS: { code: string; labelTr: string }[] = [
  { code: "TR", labelTr: "Türkiye" },
  { code: "UA", labelTr: "Ukrayna" },
  { code: "DE", labelTr: "Almanya" },
  { code: "PL", labelTr: "Polonya" },
  { code: "RO", labelTr: "Romanya" },
  { code: "BG", labelTr: "Bulgaristan" },
  { code: "NL", labelTr: "Hollanda" },
  { code: "HU", labelTr: "Macaristan" },
];

const LABEL_TR: Record<string, string> = Object.fromEntries(
  REGISTRATION_COUNTRY_OPTIONS.map((c) => [c.code, c.labelTr]),
);

export function normalizeCountryCode(raw: string | null | undefined): string | null {
  const c = raw?.trim().toUpperCase();
  if (!c || c === "—" || c === "-") {
    return null;
  }
  if (/^[A-Z]{2}$/.test(c)) {
    return c;
  }
  return null;
}

/** Unicode bölgesel gösterge çifti (ör. TR → 🇹🇷). */
export function countryFlagEmoji(code: string): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized) {
    return "🏳";
  }
  const base = 0x1f1e6;
  return String.fromCodePoint(
    ...normalized.split("").map((char) => base + char.charCodeAt(0) - 65),
  );
}

export function countryLabelTr(code: string): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized) {
    return "—";
  }
  return LABEL_TR[normalized] ?? normalized;
}

/** API (kayıt) öncelikli; yoksa localStorage profil. */
export function resolveOrganizationCountryCode(
  profileCode: string,
  apiCode?: string | null,
): string {
  const fromApi = normalizeCountryCode(apiCode);
  if (fromApi) {
    return fromApi;
  }
  const fromProfile = normalizeCountryCode(profileCode);
  return fromProfile ?? "TR";
}
