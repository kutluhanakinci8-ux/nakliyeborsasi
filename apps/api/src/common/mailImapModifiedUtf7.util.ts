import utf7 = require("utf7");

/** RFC 3501 §5.1.3 — IMAP LIST / CREATE mailbox adı (modified UTF-7). */
export function encodeImapModifiedUtf7MailboxName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "";
  }
  return utf7.imap.encode(trimmed);
}

export function decodeImapModifiedUtf7MailboxName(encoded: string): string {
  return utf7.imap.decode(encoded);
}

/** Dovecot maildir alt klasörü (ASCII güvenli iç ad; görünen ad ayrı saklanır). */
export function maildirSegmentForCustomFolder(folderId: string): string {
  const safe = folderId.replace(/[^a-zA-Z0-9-]/g, "");
  return `.lerta-custom-${safe}`;
}
