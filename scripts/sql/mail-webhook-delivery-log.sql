-- Webhook teslimat denemeleri (Faz 10)
CREATE TABLE IF NOT EXISTS mail_webhook_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  webhook_endpoint_id uuid NOT NULL,
  event_type varchar(64) NOT NULL,
  delivery_id uuid NOT NULL,
  attempt smallint NOT NULL,
  http_status int NULL,
  success boolean NOT NULL DEFAULT false,
  error_message varchar(500) NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_webhook_delivery_org_created
  ON mail_webhook_delivery_log (organization_id, created_at DESC);
