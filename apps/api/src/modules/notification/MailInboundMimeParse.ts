import {
  decodePartBody,
  decodeQuotedPrintable,
  extractHtmlBodyFromMime,
  extractPlainBodyFromMime,
  listMimeParts,
} from "./MailMimePartParser";

export {
  decodeQuotedPrintable,
  extractHtmlBodyFromMime,
  extractPlainBodyFromMime,
};

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

function parseMimeHeaderValue(rawMime: string, headerName: string): string | null {
  const headEnd = rawMime.search(/\r?\n\r?\n/);
  const head = headEnd >= 0 ? rawMime.slice(0, headEnd) : rawMime;
  const unfold = head.replace(/\r?\n[ \t]+/g, " ");
  const match = unfold.match(new RegExp(`^${headerName}:\\s*(.+)$`, "im"));
  const raw = match?.[1]?.trim() ?? null;
  if (!raw) {
    return null;
  }
  const angle = raw.match(/<([^>]+)>/);
  return (angle?.[1] ?? raw).replace(/^<|>$/g, "").trim() || null;
}

export function parseInternetMessageId(rawMime: string): string | null {
  return parseMimeHeaderValue(rawMime, "Message-ID");
}

export function parseInReplyTo(rawMime: string): string | null {
  return parseMimeHeaderValue(rawMime, "In-Reply-To");
}

export type ParsedMimeAttachment = {
  filename: string;
  contentType: string;
  content: Buffer;
};

export function extractAttachmentsFromMime(
  rawMime: string,
): ParsedMimeAttachment[] {
  const results: ParsedMimeAttachment[] = [];
  for (const part of listMimeParts(rawMime)) {
    const isAttachment =
      part.contentDisposition?.includes("attachment") ||
      Boolean(part.filename);
    if (!isAttachment) {
      continue;
    }
    if (
      (part.contentType.startsWith("text/plain") ||
        part.contentType.startsWith("text/html")) &&
      !part.contentDisposition?.includes("attachment")
    ) {
      continue;
    }
    const decoded = decodePartBody(part);
    const content =
      part.encoding === "base64"
        ? Buffer.from(part.body.replace(/\s+/g, ""), "base64")
        : Buffer.from(decoded, "utf8");
    results.push({
      filename: part.filename || "attachment.bin",
      contentType: part.contentType.split(";")[0] || "application/octet-stream",
      content,
    });
  }
  return results;
}

export function normalizeEmailAddress(input: string): string {
  const trimmed = input.trim();
  const angle = trimmed.match(/<([^>]+)>/);
  const candidate = (angle?.[1] ?? trimmed).toLowerCase();
  return candidate;
}
