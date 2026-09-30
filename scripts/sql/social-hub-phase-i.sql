-- Faz I: outbound delivery hints on social thread links

ALTER TABLE company_social_thread_links
  ADD COLUMN IF NOT EXISTS "lastOutboundAt" TIMESTAMPTZ NULL;

ALTER TABLE company_social_thread_links
  ADD COLUMN IF NOT EXISTS "lastOutboundStatus" VARCHAR(16) NULL;

ALTER TABLE company_social_thread_links
  ADD COLUMN IF NOT EXISTS "lastOutboundErrorMessage" VARCHAR(512) NULL;
