import {
  isLertaBrandedOutboundHtml,
  resolveOutboundHtml,
} from "./MailOutboundHtmlTemplate";

export function buildOutgoingSentMime(params: {
  fromHeader: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text: string;
  html?: string;
  messageId: string | null;
  inReplyTo?: string | null;
  references?: string | null;
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
    ...(params.cc?.trim() ? [`Cc: ${params.cc.trim()}`] : []),
    ...(params.bcc?.trim() ? [`Bcc: ${params.bcc.trim()}`] : []),
    `Subject: ${subject}`,
    `Date: ${params.date.toUTCString()}`,
    `Message-ID: ${messageId}`,
    ...(params.inReplyTo
      ? [`In-Reply-To: ${normalizeMessageId(params.inReplyTo)}`]
      : []),
    ...(params.references
      ? [`References: ${normalizeReferences(params.references)}`]
      : []),
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

export type OutboundMimeAttachment = {
  filename: string;
  contentType: string;
  content: Buffer;
  cid?: string;
};

export function buildOutgoingSentMimeWithAttachments(
  params: {
    fromHeader: string;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    text: string;
    html?: string;
    messageId: string | null;
    inReplyTo?: string | null;
    references?: string | null;
    date: Date;
  },
  attachments: OutboundMimeAttachment[],
): string {
  if (attachments.length === 0) {
    return buildOutgoingSentMime(params);
  }
  const mixedBoundary = `=_lerta_mixed_${Date.now().toString(36)}`;
  const subject = encodeHeaderValue(params.subject);
  const messageId = normalizeMessageId(params.messageId);
  const bodyPart = buildOutgoingBodyPart({
    fromHeader: params.fromHeader,
    text: params.text,
    html: params.html,
  });
  const headers = [
    `From: ${params.fromHeader}`,
    `To: ${params.to}`,
    ...(params.cc?.trim() ? [`Cc: ${params.cc.trim()}`] : []),
    ...(params.bcc?.trim() ? [`Bcc: ${params.bcc.trim()}`] : []),
    `Subject: ${subject}`,
    `Date: ${params.date.toUTCString()}`,
    `Message-ID: ${messageId}`,
    ...(params.inReplyTo
      ? [`In-Reply-To: ${normalizeMessageId(params.inReplyTo)}`]
      : []),
    ...(params.references
      ? [`References: ${normalizeReferences(params.references)}`]
      : []),
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    "",
    `--${mixedBoundary}`,
    bodyPart,
  ];
  for (const file of attachments) {
    const encoded = file.content.toString("base64");
    const wrapped = encoded.replace(/.{1,76}/g, "$&\r\n").trimEnd();
    headers.push(
      `--${mixedBoundary}`,
      `Content-Type: ${file.contentType}; name="${file.filename}"`,
      "Content-Transfer-Encoding: base64",
      ...(file.cid
        ? [`Content-ID: <${file.cid}>`, "Content-Disposition: inline"]
        : [`Content-Disposition: attachment; filename="${file.filename}"`]),
      "",
      wrapped,
    );
  }
  headers.push(`--${mixedBoundary}--`, "");
  return headers.join("\r\n");
}

function buildOutgoingBodyPart(params: {
  fromHeader: string;
  text: string;
  html?: string;
}): string {
  const htmlBody = (
    params.html ??
    resolveOutboundHtml(params.text, undefined, {
      fromHeader: params.fromHeader,
    })
  ).replace(/\r?\n/g, "\r\n");

  if (isLertaBrandedOutboundHtml(htmlBody)) {
    return [
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      htmlBody,
    ].join("\r\n");
  }

  const textBody = params.text.replace(/\r?\n/g, "\r\n");
  const boundary = `=_lerta_alt_${Date.now().toString(36)}`;
  return [
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
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
  ].join("\r\n");
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

function normalizeReferences(raw: string): string {
  const parts = raw
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.map((part) => normalizeMessageId(part)).join(" ");
}

function encodeHeaderValue(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) {
    return value;
  }
  const encoded = Buffer.from(value, "utf8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}
