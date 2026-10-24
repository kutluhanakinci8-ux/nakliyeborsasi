ALTER TABLE mail_inbox_preferences
  ADD COLUMN IF NOT EXISTS "inboxSmartSortEnabled" boolean NOT NULL DEFAULT true;
