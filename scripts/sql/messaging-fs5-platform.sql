CREATE TABLE IF NOT EXISTS company_messaging_webhook_endpoint (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  url varchar(2048) NOT NULL,
  description varchar(120),
  events jsonb NOT NULL,
  signing_secret varchar(96) NOT NULL,
  signing_secret_prefix varchar(16) NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_messaging_webhook_company
  ON company_messaging_webhook_endpoint (company_id);

CREATE TABLE IF NOT EXISTS company_messaging_settings (
  company_id uuid PRIMARY KEY,
  retention_days int,
  retention_mode varchar(16) NOT NULL DEFAULT 'archive',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mail_organization_api_key
  ADD COLUMN IF NOT EXISTS scopes jsonb NOT NULL DEFAULT '["mail:send","mail:read"]'::jsonb;

ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS notify_push_messaging_chat boolean NOT NULL DEFAULT true;
