ALTER TABLE mail_inbox_rule
  ADD COLUMN IF NOT EXISTS to_contains varchar(320) NULL;

ALTER TABLE mail_inbox_rule
  ADD COLUMN IF NOT EXISTS require_attachment boolean NOT NULL DEFAULT false;
