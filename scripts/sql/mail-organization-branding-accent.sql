ALTER TABLE mail_organization_branding
  ADD COLUMN IF NOT EXISTS email_accent_color varchar(16);
