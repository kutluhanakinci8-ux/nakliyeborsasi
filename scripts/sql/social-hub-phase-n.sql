-- Faz N: sosyal hub Slack + gönderim önizleme

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "socialSlackWebhookUrl" VARCHAR(512) NULL;

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "socialSlackUseMessagingFallback" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE company_social_settings
  ADD COLUMN IF NOT EXISTS "socialSlackNotifyOutboundFailures" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE company_social_outbound_deliveries
  ADD COLUMN IF NOT EXISTS "bodyTextPreview" VARCHAR(280) NULL;
