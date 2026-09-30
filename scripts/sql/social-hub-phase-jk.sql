-- Faz J/K: outbound delivery log + health indexes

CREATE TABLE IF NOT EXISTS company_social_outbound_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "messageThreadId" UUID NOT NULL,
  "messageId" UUID NULL,
  "platformCode" VARCHAR(48) NOT NULL,
  status VARCHAR(16) NOT NULL,
  "errorMessage" VARCHAR(512) NULL,
  "externalMessageId" VARCHAR(128) NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_outbound_deliveries_company_created
  ON company_social_outbound_deliveries ("companyId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_social_outbound_deliveries_thread
  ON company_social_outbound_deliveries ("messageThreadId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_company_social_connections_token_expires
  ON company_social_connections ("tokenExpiresAt")
  WHERE "statusCode" = 'CONNECTED';
