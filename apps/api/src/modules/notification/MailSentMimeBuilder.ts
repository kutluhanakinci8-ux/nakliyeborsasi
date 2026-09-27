export function buildOutgoingSentMime(params: {
  fromHeader: string;
  to: string;
  subject: string;
  text: string;
  messageId: string | null;
  date: Date;
}): string {
  const messageId = normalizeMessageId(params.messageId);
  const subject = encodeHeaderValue(params.subject);
  const lines = [
    `From: ${params.fromHeader}`,
    `To: ${params.to}`,
    `Subject: ${subject}`,
    `Date: ${params.date.toUTCString()}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    params.text.replace(/\r?\n/g, "\r\n"),
  ];
  return lines.join("\r\n");
}

function normalizeMessageId(raw: string | null): string {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return `<${Date.now()}.sent@lerta.local>`;
  }
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed;
  }
  return `<${trimmed.replace(/^<|>$/g, "")}>`;
}

function encodeHeaderValue(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) {
    return value;
  }
  const encoded = Buffer.from(value, "utf8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}
