-- Faz V: yol haritası kanal ilgi listesi (firma bazlı)

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "roadmapInterestPlatformCodesJson" TEXT NULL;
