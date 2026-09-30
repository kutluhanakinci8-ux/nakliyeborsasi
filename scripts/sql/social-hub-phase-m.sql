-- Faz M: sağlık uyarı eşikleri

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "healthAlertMinSeverity" VARCHAR(16) NOT NULL DEFAULT 'attention';

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "healthAlertFailureThreshold" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "healthAlertPlatformThresholdsJson" TEXT NULL;
