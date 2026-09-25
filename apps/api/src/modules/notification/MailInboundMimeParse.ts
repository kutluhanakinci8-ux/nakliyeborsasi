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
  const plain = extractPlainBodyFromMime(rawMime);
  const textSnippet =
    (plain ?? body).replace(/\s+/g, " ").trim().slice(0, 500) || null;

  return { fromAddress, subject, textSnippet };
}

export function extractPlainBodyFromMime(rawMime: string): string | null {
  const parts = rawMime.split(/\r?\n\r?\n/);
  if (parts.length < 2) {
    return null;
  }
  const body = parts.slice(1).join("\n\n");
  const boundaryMatch = rawMime.match(/boundary="?([^"\s;]+)"?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const segments = body.split(`--${boundary}`);
    for (const segment of segments) {
      if (!/content-type:\s*text\/plain/i.test(segment)) {
        continue;
      }
      const chunkParts = segment.split(/\r?\n\r?\n/);
      if (chunkParts.length >= 2) {
        const text = chunkParts.slice(1).join("\n\n").trim();
        if (text && !text.startsWith("--")) {
          return decodeQuotedPrintable(text);
        }
      }
    }
  }
  const trimmed = body.trim();
  if (trimmed.length > 0 && !trimmed.startsWith("--")) {
    return decodeQuotedPrintable(trimmed).slice(0, 200_000);
  }
  return null;
}

function decodeQuotedPrintable(input: string): string {
  return input
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

export function normalizeEmailAddress(input: string): string {
  const trimmed = input.trim();
  const angle = trimmed.match(/<([^>]+)>/);
  const candidate = (angle?.[1] ?? trimmed).toLowerCase();
  return candidate;
}
