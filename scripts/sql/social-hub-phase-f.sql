-- Faz F: webhook idempotency + connection routing index (camelCase columns)

ALTER TABLE company_social_thread_links
  ADD COLUMN IF NOT EXISTS "lastExternalMessageId" VARCHAR(128) NULL;

CREATE INDEX IF NOT EXISTS idx_company_social_connections_external
  ON company_social_connections ("platformCode", "externalAccountId")
  WHERE "externalAccountId" IS NOT NULL;
