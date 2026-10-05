-- Kampanya landing URL (prod manual apply when TYPEORM_SYNCHRONIZE=false)

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS campaign_landing_url VARCHAR(512) NULL;
