-- Faz R: özet iş saatleri + bildirim zaman çizelgesi alanları

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "socialSlackDigestBusinessHoursOnly" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "socialSlackDigestTimezone" VARCHAR(64) NOT NULL DEFAULT 'Europe/Istanbul';

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "socialSlackDigestHourStart" INT NOT NULL DEFAULT 9;

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "socialSlackDigestHourEnd" INT NOT NULL DEFAULT 18;
