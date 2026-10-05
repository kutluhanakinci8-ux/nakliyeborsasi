-- Faz BE: kampanya landing URL (Telegram Ads / UTM öncesi)

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS campaign_landing_url VARCHAR(512) NULL;
