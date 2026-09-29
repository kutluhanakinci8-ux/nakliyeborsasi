-- Lerta Mail — imza ve kurumsal şablonlar (compose-presets API)
CREATE TABLE IF NOT EXISTS mail_compose_preset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  owner_user_id uuid,
  kind varchar(16) NOT NULL,
  name varchar(120) NOT NULL,
  subject varchar(500),
  body_text text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_compose_preset_org
  ON mail_compose_preset (organization_id);

CREATE INDEX IF NOT EXISTS idx_mail_compose_preset_org_kind
  ON mail_compose_preset (organization_id, kind);
