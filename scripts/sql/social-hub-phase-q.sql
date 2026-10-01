-- Faz Q: sağlık Slack dedup süresi

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "healthAlertSlackCooldownMinutes" INT NOT NULL DEFAULT 1440;
