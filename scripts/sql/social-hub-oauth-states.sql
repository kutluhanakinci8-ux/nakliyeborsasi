-- Faz E: OAuth state + opsiyonel token alanı (prod manual apply)

CREATE TABLE IF NOT EXISTS company_social_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_token VARCHAR(128) NOT NULL UNIQUE,
  company_id UUID NOT NULL,
  platform_code VARCHAR(48) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_oauth_state_company
  ON company_social_oauth_states (company_id);

ALTER TABLE company_social_connections
  ADD COLUMN IF NOT EXISTS access_token_ciphertext TEXT NULL;
