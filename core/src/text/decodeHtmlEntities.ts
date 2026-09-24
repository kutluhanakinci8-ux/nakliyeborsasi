/**
 * Decode common HTML entities from scraped meta / visible text.
 * WordPress and CMS often emit &#039; in meta description attributes.
 */
export function decodeHtmlEntities(raw: string): string {
  if (!raw.includes("&")) {
    return raw;
  }
  return raw
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    );
}

/** Remove contact labels accidentally merged into address lines. */
export function scrubMergedContactFromAddress(address: string): string {
  let value = decodeHtmlEntities(address).replace(/\s+/g, " ").trim();
  const stopPatterns = [
    /\s+Telefon\s*:/i,
    /\s+Tel\s*:/i,
    /\s+GSM\s*:/i,
    /\s+WhatsApp\b/i,
    /\s+E\s*[- ]?Posta\s*:/i,
    /\s+Email\s*:/i,
    /\s+E-posta\s*:/i,
    /\s+Web\s*:/i,
    /\s+Facebook\b/i,
  ];
  for (const stop of stopPatterns) {
    const cut = value.split(stop)[0];
    if (cut && cut.length < value.length) {
      value = cut.trim();
    }
  }
  return value.slice(0, 220).trim();
}
