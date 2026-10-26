-- Gelen kutusu içerik kategorisi (Gmail sekmeleri + Outlook "kategorilere ayrılmış" filtresi)
ALTER TABLE mail_inbound_message
  ADD COLUMN IF NOT EXISTS inbox_category VARCHAR(32) NULL;

CREATE INDEX IF NOT EXISTS idx_mail_inbound_inbox_category
  ON mail_inbound_message ("mailboxId", inbox_category)
  WHERE inbox_category IS NOT NULL;

CREATE TABLE IF NOT EXISTS mail_inbox_category_override (
  organization_id UUID NOT NULL,
  from_address_lower VARCHAR(320) NOT NULL,
  inbox_category VARCHAR(32) NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, from_address_lower)
);
