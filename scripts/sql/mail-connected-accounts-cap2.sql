-- CAP-2: Microsoft Graph çoklu klasör delta, konuşma kimliği, ek meta

ALTER TABLE mail_exchange_sync_account
  ADD COLUMN IF NOT EXISTS folder_delta_links jsonb NULL;

ALTER TABLE mail_inbound_message
  ADD COLUMN IF NOT EXISTS exchange_conversation_id varchar(255) NULL;

ALTER TABLE mail_inbound_message
  ADD COLUMN IF NOT EXISTS exchange_well_known_folder varchar(32) NULL;

CREATE INDEX IF NOT EXISTS idx_mail_inbound_exchange_conversation
  ON mail_inbound_message (exchange_sync_account_id, exchange_conversation_id)
  WHERE exchange_conversation_id IS NOT NULL;
