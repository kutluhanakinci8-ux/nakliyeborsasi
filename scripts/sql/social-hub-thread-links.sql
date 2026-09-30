CREATE TABLE IF NOT EXISTS company_social_thread_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  platform_code VARCHAR(48) NOT NULL,
  external_thread_id VARCHAR(128) NOT NULL,
  message_thread_id UUID NOT NULL UNIQUE,
  virtual_counterparty_id UUID NOT NULL,
  display_label VARCHAR(240) NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  last_inbound_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_social_thread_external UNIQUE (company_id, platform_code, external_thread_id)
);

CREATE INDEX IF NOT EXISTS idx_social_thread_links_company_open
  ON company_social_thread_links (company_id, is_open);
