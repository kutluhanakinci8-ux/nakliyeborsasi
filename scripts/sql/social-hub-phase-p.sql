-- Faz P: günlük Slack özet digest

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "socialSlackDailyDigestEnabled" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "socialSlackDailyDigestLastSentAt" TIMESTAMPTZ NULL;
