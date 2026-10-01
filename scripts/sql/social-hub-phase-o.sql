-- Faz O: Slack outbound dedup + cooldown ayarı

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "socialSlackOutboundFailureCooldownMinutes" INT NOT NULL DEFAULT 15;

CREATE TABLE IF NOT EXISTS company_social_slack_notify_dedup (
  "companyId" UUID NOT NULL,
  "dedupKey" VARCHAR(128) NOT NULL,
  "lastSentAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("companyId", "dedupKey")
);

CREATE INDEX IF NOT EXISTS idx_social_slack_dedup_last_sent
  ON company_social_slack_notify_dedup ("companyId", "lastSentAt");
