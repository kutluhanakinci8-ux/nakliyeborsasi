export function decodeQuotedPrintable(input: string): string {
  return input
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

export type MimePart = {
  contentType: string;
  contentDisposition: string | null;
  filename: string | null;
  encoding: string;
  body: string;
};

export function listMimeParts(rawMime: string): MimePart[] {
  const boundaryMatch = rawMime.match(/boundary="?([^"\s;]+)"?/i);
  if (!boundaryMatch) {
    const headEnd = rawMime.search(/\r?\n\r?\n/);
    if (headEnd < 0) {
      return [];
    }
    const head = rawMime.slice(0, headEnd);
    const body = rawMime.slice(headEnd).replace(/^\r?\n\r?\n/, "");
    const typeMatch = head.match(/content-type:\s*([^;\r\n]+)/i);
    const encMatch = head.match(/content-transfer-encoding:\s*(\S+)/i);
    return [
      {
        contentType: (typeMatch?.[1] ?? "text/plain").trim().toLowerCase(),
        contentDisposition: null,
        filename: null,
        encoding: (encMatch?.[1] ?? "").toLowerCase(),
        body,
      },
    ];
  }
  const boundary = boundaryMatch[1];
  const headEnd = rawMime.search(/\r?\n\r?\n/);
  const body =
    headEnd >= 0 ? rawMime.slice(headEnd).replace(/^\r?\n\r?\n/, "") : rawMime;
  const segments = body.split(`--${boundary}`);
  const parts: MimePart[] = [];
  for (const segment of segments) {
    if (!segment.trim() || segment.trim() === "--") {
      continue;
    }
    const chunkParts = segment.split(/\r?\n\r?\n/);
    if (chunkParts.length < 2) {
      continue;
    }
    const head = chunkParts[0];
    const rawBody = chunkParts.slice(1).join("\n\n").trim();
    if (!rawBody || rawBody.startsWith("--")) {
      continue;
    }
    const typeMatch = head.match(/content-type:\s*([^;\r\n]+)/i);
    const dispMatch = head.match(/content-disposition:\s*([^;\r\n]+)/i);
    const encMatch = head.match(/content-transfer-encoding:\s*(\S+)/i);
    const filenameMatch =
      head.match(/filename="?([^"\r\n;]+)"?/i) ||
      head.match(/name="?([^"\r\n;]+)"?/i);
    parts.push({
      contentType: (typeMatch?.[1] ?? "text/plain").trim().toLowerCase(),
      contentDisposition: dispMatch?.[1]?.trim().toLowerCase() ?? null,
      filename: filenameMatch?.[1]?.trim() ?? null,
      encoding: (encMatch?.[1] ?? "").toLowerCase(),
      body: rawBody,
    });
  }
  return parts;
}

export function decodePartBody(part: MimePart): string {
  if (part.encoding === "base64") {
    return Buffer.from(part.body.replace(/\s+/g, ""), "base64").toString("utf8");
  }
  if (part.encoding === "quoted-printable" || part.encoding === "qp") {
    return decodeQuotedPrintable(part.body);
  }
  return part.body;
}

export function extractPlainBodyFromMime(rawMime: string): string | null {
  const parts = listMimeParts(rawMime);
  for (const part of parts) {
    if (
      part.contentType.startsWith("text/plain") &&
      !part.contentDisposition?.includes("attachment")
    ) {
      const text = decodePartBody(part).trim();
      if (text) {
        return text.slice(0, 200_000);
      }
    }
  }
  return null;
}

export function extractHtmlBodyFromMime(rawMime: string): string | null {
  const parts = listMimeParts(rawMime);
  for (const part of parts) {
    if (
      part.contentType.startsWith("text/html") &&
      !part.contentDisposition?.includes("attachment")
    ) {
      const html = decodePartBody(part).trim();
      if (html) {
        return html.slice(0, 500_000);
      }
    }
  }
  return null;
}
