-- Paylaşımlı kutu / Gmail tarzı delegasyon + Microsoft Exchange (Graph) senkronu

ALTER TABLE mail_mailbox
  ADD COLUMN IF NOT EXISTS access_mode varchar(24) NOT NULL DEFAULT 'organization';

ALTER TABLE mail_mailbox
  ADD COLUMN IF NOT EXISTS owner_user_id uuid NULL;

CREATE TABLE IF NOT EXISTS mail_mailbox_delegate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid NOT NULL REFERENCES mail_mailbox (id) ON DELETE CASCADE,
  delegate_user_id uuid NOT NULL,
  permission varchar(16) NOT NULL DEFAULT 'send',
  created_by_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mail_mailbox_delegate_permission_chk
    CHECK (permission IN ('read', 'send', 'manage'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_mailbox_delegate_unique
  ON mail_mailbox_delegate (mailbox_id, delegate_user_id);

CREATE INDEX IF NOT EXISTS idx_mail_mailbox_delegate_user
  ON mail_mailbox_delegate (delegate_user_id);

CREATE TABLE IF NOT EXISTS mail_exchange_sync_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  connected_by_user_id uuid NOT NULL,
  microsoft_user_id varchar(120) NULL,
  email_address varchar(320) NOT NULL,
  display_name varchar(200) NULL,
  refresh_token_ciphertext text NULL,
  access_token_ciphertext text NULL,
  access_token_expires_at timestamptz NULL,
  delta_link text NULL,
  mailbox_id uuid NULL REFERENCES mail_mailbox (id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz NULL,
  last_sync_error varchar(500) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_exchange_sync_account_org
  ON mail_exchange_sync_account (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_exchange_sync_account_org_email
  ON mail_exchange_sync_account (organization_id, lower(email_address));

ALTER TABLE mail_inbound_message
  ADD COLUMN IF NOT EXISTS exchange_sync_account_id uuid NULL;

ALTER TABLE mail_inbound_message
  ADD COLUMN IF NOT EXISTS exchange_message_id varchar(255) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_inbound_exchange_message
  ON mail_inbound_message (exchange_sync_account_id, exchange_message_id)
  WHERE exchange_message_id IS NOT NULL AND exchange_sync_account_id IS NOT NULL;
