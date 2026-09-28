-- Gönderilen kayıtları çöp kutusu (Gmail/Outlook: Sil → Çöp)
ALTER TABLE mail_mailbox_sent
  ADD COLUMN IF NOT EXISTS "trashedAt" timestamptz;

CREATE INDEX IF NOT EXISTS "IDX_mail_mailbox_sent_org_trashed"
  ON mail_mailbox_sent ("organizationId", "trashedAt");
