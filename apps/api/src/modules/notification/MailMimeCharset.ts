const CHARSET_ALIASES: Record<string, string> = {
  utf8: "utf-8",
  "utf-8": "utf-8",
  us_ascii: "utf-8",
  ascii: "utf-8",
  latin5: "iso-8859-9",
  iso_8859_9: "iso-8859-9",
  "iso-8859-9": "iso-8859-9",
  cp1254: "windows-1254",
  "windows-1254": "windows-1254",
  latin3: "iso-8859-3",
  "iso-8859-3": "iso-8859-3",
  latin1: "iso-8859-1",
  "iso-8859-1": "iso-8859-1",
  iso_8859_1: "iso-8859-1",
};

export function normalizeMimeCharset(charset: string | null | undefined): string {
  const raw = (charset ?? "utf-8").trim().toLowerCase().replace(/^charset:/, "");
  const unquoted = raw.replace(/^["']|["']$/g, "");
  const normalized = unquoted.replace(/_/g, "-");
  return CHARSET_ALIASES[normalized] ?? CHARSET_ALIASES[unquoted] ?? normalized;
}

export function charsetFromContentType(contentType: string): string {
  const match = contentType.match(/charset\s*=\s*"?([^"\s;]+)"?/i);
  return normalizeMimeCharset(match?.[1] ?? "utf-8");
}

export function decodeBytesWithCharset(bytes: Buffer, charset: string): string {
  const label = normalizeMimeCharset(charset);
  try {
    return new TextDecoder(label, { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
}

const ENCODED_WORD_RE =
  /=\?([^?]+)\?([BbQq])\?([\s\S]*?)\?=/g;

/** RFC 2047 encoded-words in Subject, From display names, etc. */
export function decodeMimeEncodedWords(value: string): string {
  if (!value || !value.includes("=?")) {
    return value;
  }
  let result = "";
  let lastIndex = 0;
  for (const match of value.matchAll(ENCODED_WORD_RE)) {
    const index = match.index ?? 0;
    result += value.slice(lastIndex, index);
    const charset = match[1];
    const encoding = match[2].toUpperCase();
    const encoded = match[3];
    let bytes: Buffer;
    if (encoding === "B") {
      bytes = Buffer.from(encoded.replace(/\s+/g, ""), "base64");
    } else {
      const qp = encoded.replace(/_/g, " ");
      const out: number[] = [];
      for (let i = 0; i < qp.length; i++) {
        const ch = qp[i];
        if (ch === "=" && i + 2 < qp.length) {
          out.push(parseInt(qp.slice(i + 1, i + 3), 16));
          i += 2;
        } else {
          out.push(qp.charCodeAt(i));
        }
      }
      bytes = Buffer.from(out);
    }
    result += decodeBytesWithCharset(bytes, charset);
    lastIndex = index + match[0].length;
  }
  result += value.slice(lastIndex);
  return result.replace(/[ \t]+/g, " ").trim();
}
