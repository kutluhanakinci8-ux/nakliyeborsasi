-- CAP-3: Gmail API posta senkronu

CREATE TABLE IF NOT EXISTS mail_gmail_sync_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  connected_by_user_id uuid NOT NULL,
  google_user_id varchar(120) NULL,
  email_address varchar(320) NOT NULL,
  display_name varchar(200) NULL,
  refresh_token_ciphertext text NULL,
  access_token_ciphertext text NULL,
  access_token_expires_at timestamptz NULL,
  history_id varchar(64) NULL,
  mailbox_id uuid NULL REFERENCES mail_mailbox (id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz NULL,
  last_sync_error varchar(500) NULL,
  gmail_watch_expiration timestamptz NULL,
  gmail_watch_topic varchar(500) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_gmail_sync_account_org
  ON mail_gmail_sync_account (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_gmail_sync_account_org_email
  ON mail_gmail_sync_account (organization_id, lower(email_address));

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_inbound_gmail_message
  ON mail_inbound_message (gmail_sync_account_id, gmail_message_id)
  WHERE gmail_sync_account_id IS NOT NULL AND gmail_message_id IS NOT NULL;
