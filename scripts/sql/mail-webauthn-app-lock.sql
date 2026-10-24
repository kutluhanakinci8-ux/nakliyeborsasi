CREATE TABLE IF NOT EXISTS user_webauthn_credential (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credential_id text NOT NULL,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_name varchar(120) NULL,
  transports jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_webauthn_credential_id
  ON user_webauthn_credential (credential_id);

CREATE INDEX IF NOT EXISTS idx_user_webauthn_credential_user
  ON user_webauthn_credential (user_id);

ALTER TABLE mail_inbox_preferences
  ADD COLUMN IF NOT EXISTS "mailAppLockEnabled" boolean NOT NULL DEFAULT false;
