-- FS-8: firma arama + Mesajlar hub varsayılan sekme
ALTER TABLE company_messaging_settings
  ADD COLUMN IF NOT EXISTS default_hub_tab varchar(16) NOT NULL DEFAULT 'email';

COMMENT ON COLUMN company_messaging_settings.default_hub_tab IS
  'email | chat — /messaging varsayılan sekme (org)';
