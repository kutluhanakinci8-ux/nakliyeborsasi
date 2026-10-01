-- Faz S: haftalık e-posta özet

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "socialHubWeeklyEmailEnabled" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "socialHubWeeklyEmailLastSentAt" TIMESTAMPTZ NULL;
