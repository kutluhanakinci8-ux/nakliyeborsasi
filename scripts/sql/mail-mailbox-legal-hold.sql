ALTER TABLE mail_mailbox
  ADD COLUMN IF NOT EXISTS legal_hold_at timestamptz;
