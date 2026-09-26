/** SMTP envelope recipients (MAIL TO) from header strings. */
export function collectSmtpEnvelopeRecipients(params: {
  to: string;
  cc?: string;
  bcc?: string;
}): string[] {
  const raw = [params.to, params.cc, params.bcc].filter(Boolean).join(",");
  const emails: string[] = [];
  for (const part of raw.split(/[,;]/)) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const angle = trimmed.match(/<([^>]+)>/);
    const email = (angle?.[1] ?? trimmed).trim().toLowerCase();
    if (email.includes("@")) {
      emails.push(email);
    }
  }
  return [...new Set(emails)];
}
