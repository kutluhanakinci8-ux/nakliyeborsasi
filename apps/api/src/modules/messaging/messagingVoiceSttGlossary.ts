/** Lojistik STT düzeltmeleri (basit sözlük — STT-2). */
const REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bcmr\b/gi, replacement: "CMR" },
  { pattern: /\badr\b/gi, replacement: "ADR" },
  { pattern: /\btır\b/gi, replacement: "TIR" },
  { pattern: /\bfcl\b/gi, replacement: "FCL" },
  { pattern: /\blcl\b/gi, replacement: "LCL" },
  { pattern: /\byük\s*veren\b/gi, replacement: "yükveren" },
];

export function applyMessagingVoiceSttGlossary(text: string): string {
  let out = text;
  for (const rule of REPLACEMENTS) {
    out = out.replace(rule.pattern, rule.replacement);
  }
  return out;
}

export function resolveMessagingVoiceSttLanguage(
  locale: string,
  explicit?: string | null,
): string | undefined {
  const raw = explicit?.trim().toLowerCase() || locale.trim().toLowerCase();
  if (raw.startsWith("tr")) {
    return "tr";
  }
  if (raw.startsWith("uk") || raw.startsWith("ua")) {
    return "uk";
  }
  if (raw.startsWith("en")) {
    return "en";
  }
  return undefined;
}
