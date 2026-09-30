-- Social hub (omnichannel skeleton) — prod manual apply when TYPEORM_SYNCHRONIZE=false

CREATE TABLE IF NOT EXISTS company_social_settings (
  company_id UUID PRIMARY KEY,
  inbox_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  publishing_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  dispatcher_can_reply BOOLEAN NOT NULL DEFAULT FALSE,
  dispatcher_can_publish BOOLEAN NOT NULL DEFAULT FALSE,
  owner_approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  kvkk_accepted_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  platform_code VARCHAR(48) NOT NULL,
  external_account_id VARCHAR(128) NULL,
  display_name VARCHAR(240) NULL,
  profile_url VARCHAR(512) NULL,
  status_code VARCHAR(32) NOT NULL,
  last_error_message VARCHAR(512) NULL,
  granted_scopes VARCHAR(512) NULL,
  connected_at TIMESTAMPTZ NULL,
  token_expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_company_social_connection_platform UNIQUE (company_id, platform_code)
);

CREATE INDEX IF NOT EXISTS idx_company_social_connections_company
  ON company_social_connections (company_id);

CREATE TABLE IF NOT EXISTS company_social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  platform_codes VARCHAR(256) NOT NULL,
  status_code VARCHAR(32) NOT NULL,
  body_text TEXT NOT NULL,
  media_urls_json TEXT NULL,
  scheduled_at TIMESTAMPTZ NULL,
  published_at TIMESTAMPTZ NULL,
  external_post_id VARCHAR(128) NULL,
  last_error_message VARCHAR(512) NULL,
  created_by_user_id UUID NOT NULL,
  approved_at TIMESTAMPTZ NULL,
  approved_by_user_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_social_posts_company_status
  ON company_social_posts (company_id, status_code);

CREATE TABLE IF NOT EXISTS company_social_reply_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  title VARCHAR(120) NOT NULL,
  body_text TEXT NOT NULL,
  channel_scope_code VARCHAR(48) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_social_templates_company
  ON company_social_reply_templates (company_id);
