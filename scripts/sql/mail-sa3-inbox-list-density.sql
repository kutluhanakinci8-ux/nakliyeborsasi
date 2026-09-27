-- S-A3: Gelen kutusu liste yoğunluğu
ALTER TABLE mail_inbox_preferences
  ADD COLUMN IF NOT EXISTS "inboxListDensity" varchar(16) NOT NULL DEFAULT 'comfortable';
