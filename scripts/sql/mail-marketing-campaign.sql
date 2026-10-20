-- Lerta Mail — marketing campaign history & scheduling
CREATE TABLE IF NOT EXISTS mail_marketing_campaign (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  created_by_user_id uuid,
  subject varchar(500) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'scheduled',
  schedule_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  payload jsonb NOT NULL,
  result jsonb,
  error_message varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_marketing_campaign_org_created
  ON mail_marketing_campaign (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mail_marketing_campaign_scheduled
  ON mail_marketing_campaign (status, schedule_at)
  WHERE status = 'scheduled';
