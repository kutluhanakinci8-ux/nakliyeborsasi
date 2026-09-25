-- Lerta Mail — compose drafts (run once on Postgres)
CREATE TABLE IF NOT EXISTS mail_compose_draft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL,
  to_address varchar(320),
  subject varchar(500),
  body_text text,
  attachments jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_compose_draft_org_user
  ON mail_compose_draft (organization_id, created_by_user_id);
