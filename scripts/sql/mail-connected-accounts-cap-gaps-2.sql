-- CAP: Lerta taslak ↔ bağlı hesap iki yön (provider draft id)

ALTER TABLE mail_compose_draft
  ADD COLUMN IF NOT EXISTS connected_send_provider varchar(32) NULL,
  ADD COLUMN IF NOT EXISTS connected_send_account_id uuid NULL,
  ADD COLUMN IF NOT EXISTS provider_draft_id varchar(255) NULL;
