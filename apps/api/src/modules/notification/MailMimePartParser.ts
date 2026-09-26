import {
  charsetFromContentType,
  decodeBytesWithCharset,
} from "./MailMimeCharset";

export function decodeQuotedPrintableBytes(input: string): Buffer {
  const normalized = input.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === "=" && i + 2 < normalized.length) {
      const hex = normalized.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    bytes.push(normalized.charCodeAt(i) & 0xff);
  }
  return Buffer.from(bytes);
}

/** @deprecated Prefer decodePartBody with charset */
export function decodeQuotedPrintable(input: string): string {
  return decodeQuotedPrintableBytes(input).toString("latin1");
}

export type MimePart = {
  contentType: string;
  charset: string;
  headers: string;
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
    const contentType = (typeMatch?.[1] ?? "text/plain").trim().toLowerCase();
    return [
      {
        contentType,
        charset: charsetFromContentType(head),
        headers: head,
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
    const contentType = (typeMatch?.[1] ?? "text/plain").trim().toLowerCase();
    parts.push({
      contentType,
      charset: charsetFromContentType(head),
      headers: head,
      contentDisposition: dispMatch?.[1]?.trim().toLowerCase() ?? null,
      filename: filenameMatch?.[1]?.trim() ?? null,
      encoding: (encMatch?.[1] ?? "").toLowerCase(),
      body: rawBody,
    });
  }
  return parts;
}

function boundaryFromHeaderBlock(head: string): string | null {
  const match = head.match(/boundary="?([^"\s;]+)"?/i);
  return match?.[1] ?? null;
}

function listMimePartsFromBody(body: string, boundary: string): MimePart[] {
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
    const contentType = (typeMatch?.[1] ?? "text/plain").trim().toLowerCase();
    parts.push({
      contentType,
      charset: charsetFromContentType(head),
      headers: head,
      contentDisposition: dispMatch?.[1]?.trim().toLowerCase() ?? null,
      filename: filenameMatch?.[1]?.trim() ?? null,
      encoding: (encMatch?.[1] ?? "").toLowerCase(),
      body: rawBody,
    });
  }
  return parts;
}

/** Walk nested multipart/* and return leaf parts. */
export function flattenMimeParts(rawMime: string): MimePart[] {
  const top = listMimeParts(rawMime);
  const out: MimePart[] = [];
  const visit = (part: MimePart) => {
    if (part.contentType.startsWith("multipart/")) {
      const boundary = boundaryFromHeaderBlock(part.headers);
      if (boundary) {
        for (const nested of listMimePartsFromBody(part.body, boundary)) {
          visit(nested);
        }
        return;
      }
    }
    out.push(part);
  };
  for (const part of top) {
    visit(part);
  }
  return out;
}

export function decodePartBodyBytes(part: MimePart): Buffer {
  if (part.encoding === "base64") {
    return Buffer.from(part.body.replace(/\s+/g, ""), "base64");
  }
  if (part.encoding === "quoted-printable" || part.encoding === "qp") {
    return decodeQuotedPrintableBytes(part.body);
  }
  return Buffer.from(part.body, "latin1");
}

export function decodePartBody(part: MimePart): string {
  const bytes = decodePartBodyBytes(part);
  return decodeBytesWithCharset(bytes, part.charset);
}

export function extractPlainBodyFromMime(rawMime: string): string | null {
  const parts = flattenMimeParts(rawMime);
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
  const parts = flattenMimeParts(rawMime);
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
