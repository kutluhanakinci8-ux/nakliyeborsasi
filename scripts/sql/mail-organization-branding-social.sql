ALTER TABLE mail_organization_branding
  ADD COLUMN IF NOT EXISTS email_social_links jsonb NULL;
