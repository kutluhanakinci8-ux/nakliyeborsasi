import {
  isLertaBrandedOutboundHtml,
  resolveOutboundHtml,
} from "./MailOutboundHtmlTemplate";

export function buildOutgoingSentMime(params: {
  fromHeader: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  messageId: string | null;
  date: Date;
}): string {
  const messageId = normalizeMessageId(params.messageId);
  const subject = encodeHeaderValue(params.subject);
  const htmlBody = (
    params.html ??
    resolveOutboundHtml(params.text, undefined, {
      fromHeader: params.fromHeader,
    })
  ).replace(/\r?\n/g, "\r\n");

  const headers = [
    `From: ${params.fromHeader}`,
    `To: ${params.to}`,
    `Subject: ${subject}`,
    `Date: ${params.date.toUTCString()}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
  ];

  if (isLertaBrandedOutboundHtml(htmlBody)) {
    return [
      ...headers,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      htmlBody,
    ].join("\r\n");
  }

  const textBody = params.text.replace(/\r?\n/g, "\r\n");
  const boundary = `=_lerta_sent_${Date.now().toString(36)}`;
  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

  const parts = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    textBody,
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    htmlBody,
    `--${boundary}--`,
    "",
  ];

  return [...headers, "", ...parts].join("\r\n");
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
