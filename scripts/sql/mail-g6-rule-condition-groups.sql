ALTER TABLE mail_inbox_rule
  ADD COLUMN IF NOT EXISTS condition_groups_json text NULL;
