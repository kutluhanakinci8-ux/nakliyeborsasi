-- Faz L: sağlık uyarı ayarları

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "healthAlertsEnabled" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "healthAlertLastSentAt" TIMESTAMPTZ NULL;

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "lastHealthAlertStatus" VARCHAR(24) NULL;
