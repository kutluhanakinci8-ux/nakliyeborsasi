CREATE TABLE IF NOT EXISTS mail_user_inbox_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(80) NOT NULL,
  color_key VARCHAR(24) NOT NULL DEFAULT 'blue',
  icon_key VARCHAR(24) NOT NULL DEFAULT 'tag',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mail_user_inbox_category_org
  ON mail_user_inbox_category (organization_id, sort_order);

ALTER TABLE mail_inbound_message
  ADD COLUMN IF NOT EXISTS user_inbox_category_id UUID NULL;

CREATE INDEX IF NOT EXISTS idx_mail_inbound_user_inbox_category
  ON mail_inbound_message ("mailboxId", user_inbox_category_id)
  WHERE user_inbox_category_id IS NOT NULL;
