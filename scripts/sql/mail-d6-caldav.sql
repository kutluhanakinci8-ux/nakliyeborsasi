-- CalDAV hesap bağlama (org düzeyinde, şifreli kimlik bilgisi)
CREATE TABLE IF NOT EXISTS mail_calendar_caldav_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  label varchar(120) NOT NULL,
  calendar_url varchar(2000) NOT NULL,
  username varchar(320) NOT NULL,
  password_ciphertext text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  write_enabled boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz NULL,
  last_sync_error varchar(500) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_calendar_caldav_account_org
  ON mail_calendar_caldav_account (organization_id);

ALTER TABLE mail_calendar_event
  ADD COLUMN IF NOT EXISTS caldav_account_id uuid NULL;

ALTER TABLE mail_calendar_event
  ADD COLUMN IF NOT EXISTS caldav_resource_href varchar(2000) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_calendar_event_caldav_uid
  ON mail_calendar_event (organization_id, caldav_account_id, external_uid)
  WHERE external_uid IS NOT NULL AND caldav_account_id IS NOT NULL;
