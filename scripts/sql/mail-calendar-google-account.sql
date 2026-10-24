-- Google Calendar OAuth hesabı
CREATE TABLE IF NOT EXISTS mail_calendar_google_account (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  connected_by_user_id UUID NOT NULL,
  google_user_id VARCHAR(120),
  email_address VARCHAR(320) NOT NULL,
  display_name VARCHAR(200),
  refresh_token_ciphertext TEXT,
  access_token_ciphertext TEXT,
  access_token_expires_at TIMESTAMPTZ,
  sync_token TEXT,
  write_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  last_sync_error VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mail_calendar_google_account_org
  ON mail_calendar_google_account (organization_id);

ALTER TABLE mail_calendar_event
  ADD COLUMN IF NOT EXISTS google_account_id UUID NULL;

ALTER TABLE mail_calendar_event
  ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(200) NULL;

ALTER TABLE mail_calendar_event
  ADD COLUMN IF NOT EXISTS google_etag VARCHAR(200) NULL;

CREATE INDEX IF NOT EXISTS idx_mail_calendar_event_google
  ON mail_calendar_event (google_account_id, google_event_id)
  WHERE google_event_id IS NOT NULL;
