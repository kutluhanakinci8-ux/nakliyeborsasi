ALTER TABLE mail_mailbox_sent
  ADD COLUMN IF NOT EXISTS body_html text NULL;
