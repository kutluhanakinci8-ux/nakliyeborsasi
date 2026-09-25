export function parseMinimalMimeHeaders(rawMime: string): {
  fromAddress: string | null;
  subject: string | null;
  textSnippet: string | null;
} {
  const headEnd = rawMime.search(/\r?\n\r?\n/);
  const head = headEnd >= 0 ? rawMime.slice(0, headEnd) : rawMime.slice(0, 4000);
  const body =
    headEnd >= 0 ? rawMime.slice(headEnd).replace(/^\r?\n\r?\n/, "") : "";

  const unfold = head.replace(/\r?\n[ \t]+/g, " ");
  const fromMatch = unfold.match(/^From:\s*(.+)$/im);
  const subjectMatch = unfold.match(/^Subject:\s*(.+)$/im);
  const fromRaw = fromMatch?.[1]?.trim() ?? null;
  const fromAddress =
    fromRaw?.match(/<([^>]+)>/)?.[1] ??
    fromRaw?.match(/[\w.+-]+@[\w.-]+/)?.[0] ??
    fromRaw;
  const subject = subjectMatch?.[1]?.trim() ?? null;
  const textSnippet = body.replace(/\s+/g, " ").trim().slice(0, 500) || null;

  return { fromAddress, subject, textSnippet };
}

export function normalizeEmailAddress(input: string): string {
  const trimmed = input.trim();
  const angle = trimmed.match(/<([^>]+)>/);
  const candidate = (angle?.[1] ?? trimmed).toLowerCase();
  return candidate;
}
