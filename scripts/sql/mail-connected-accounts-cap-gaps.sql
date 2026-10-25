-- CAP kod boşlukları: Gmail thread + Graph push abonelik meta

ALTER TABLE mail_inbound_message
  ADD COLUMN IF NOT EXISTS gmail_thread_id varchar(64) NULL;

ALTER TABLE mail_exchange_sync_account
  ADD COLUMN IF NOT EXISTS graph_subscription_id varchar(120) NULL,
  ADD COLUMN IF NOT EXISTS graph_subscription_expiration timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_mail_inbound_gmail_thread
  ON mail_inbound_message (gmail_sync_account_id, gmail_thread_id)
  WHERE gmail_thread_id IS NOT NULL;
