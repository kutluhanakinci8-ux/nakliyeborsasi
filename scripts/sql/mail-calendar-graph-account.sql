-- Microsoft Graph takvim hesabı (OAuth)
CREATE TABLE IF NOT EXISTS mail_calendar_graph_account (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  connected_by_user_id UUID NOT NULL,
  microsoft_user_id VARCHAR(120),
  email_address VARCHAR(320) NOT NULL,
  display_name VARCHAR(200),
  refresh_token_ciphertext TEXT,
  access_token_ciphertext TEXT,
  access_token_expires_at TIMESTAMPTZ,
  delta_link TEXT,
  write_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  last_sync_error VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mail_calendar_graph_account_org
  ON mail_calendar_graph_account (organization_id);

ALTER TABLE mail_calendar_event
  ADD COLUMN IF NOT EXISTS graph_account_id UUID NULL;

ALTER TABLE mail_calendar_event
  ADD COLUMN IF NOT EXISTS graph_event_id VARCHAR(200) NULL;

ALTER TABLE mail_calendar_event
  ADD COLUMN IF NOT EXISTS graph_change_key VARCHAR(200) NULL;

CREATE INDEX IF NOT EXISTS idx_mail_calendar_event_graph
  ON mail_calendar_event (graph_account_id, graph_event_id)
  WHERE graph_event_id IS NOT NULL;
