CREATE TABLE IF NOT EXISTS mail_contact_carddav_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  label varchar(120) NOT NULL,
  addressbook_url varchar(2000) NOT NULL,
  username varchar(320) NOT NULL,
  password_ciphertext text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  write_enabled boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz NULL,
  last_sync_error varchar(500) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_contact_carddav_account_org
  ON mail_contact_carddav_account (organization_id);

ALTER TABLE mail_org_contact
  ADD COLUMN IF NOT EXISTS carddav_account_id uuid NULL;

ALTER TABLE mail_org_contact
  ADD COLUMN IF NOT EXISTS external_uid varchar(320) NULL;

ALTER TABLE mail_org_contact
  ADD COLUMN IF NOT EXISTS carddav_resource_href varchar(2000) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_org_contact_carddav_uid
  ON mail_org_contact (organization_id, carddav_account_id, external_uid)
  WHERE external_uid IS NOT NULL AND carddav_account_id IS NOT NULL;
