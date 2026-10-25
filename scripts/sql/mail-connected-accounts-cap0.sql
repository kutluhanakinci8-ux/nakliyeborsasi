-- CAP-0: bağlı hesaplar entitlement + CAP-3 için Gmail kolonları (henüz kullanılmıyor)

CREATE TABLE IF NOT EXISTS mail_connected_inbox_entitlement (
  organization_id uuid PRIMARY KEY,
  premium_enabled boolean NOT NULL DEFAULT true,
  max_connected_accounts integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mail_inbound_message
  ADD COLUMN IF NOT EXISTS gmail_sync_account_id uuid NULL;

ALTER TABLE mail_inbound_message
  ADD COLUMN IF NOT EXISTS gmail_message_id varchar(255) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_inbound_gmail_message
  ON mail_inbound_message (gmail_sync_account_id, gmail_message_id)
  WHERE gmail_sync_account_id IS NOT NULL AND gmail_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mail_inbound_exchange_account
  ON mail_inbound_message (exchange_sync_account_id)
  WHERE exchange_sync_account_id IS NOT NULL;
