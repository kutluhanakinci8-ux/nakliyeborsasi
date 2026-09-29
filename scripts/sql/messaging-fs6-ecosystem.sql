ALTER TABLE company_messaging_settings
  ADD COLUMN IF NOT EXISTS slack_incoming_webhook_url varchar(2048),
  ADD COLUMN IF NOT EXISTS slack_bridge_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS company_messaging_bot_credential (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  label varchar(80) NOT NULL,
  bot_user_id uuid NOT NULL,
  token_prefix varchar(24) NOT NULL,
  token_hash varchar(64) NOT NULL,
  scopes jsonb NOT NULL DEFAULT '["messaging:read","messaging:write"]'::jsonb,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_messaging_bot_company
  ON company_messaging_bot_credential (company_id);
