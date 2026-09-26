ALTER TABLE mail_inbox_rule
  ADD COLUMN IF NOT EXISTS match_any_condition boolean NOT NULL DEFAULT false;
