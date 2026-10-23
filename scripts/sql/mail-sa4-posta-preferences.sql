-- S-A4: Posta sekmesi davranış tercihleri (mail_inbox_preferences)
ALTER TABLE mail_inbox_preferences
  ADD COLUMN IF NOT EXISTS "undoSendSeconds" integer NOT NULL DEFAULT 5;

ALTER TABLE mail_inbox_preferences
  ADD COLUMN IF NOT EXISTS "defaultReplyMode" varchar(16) NOT NULL DEFAULT 'reply';

ALTER TABLE mail_inbox_preferences
  ADD COLUMN IF NOT EXISTS "remoteImagesPolicy" varchar(16) NOT NULL DEFAULT 'show';

ALTER TABLE mail_inbox_preferences
  ADD COLUMN IF NOT EXISTS "afterMessageAction" varchar(16) NOT NULL DEFAULT 'list';

ALTER TABLE mail_inbox_preferences
  ADD COLUMN IF NOT EXISTS "confirmPermanentDelete" boolean NOT NULL DEFAULT true;

ALTER TABLE mail_inbox_preferences
  ADD COLUMN IF NOT EXISTS "confirmBulkDelete" boolean NOT NULL DEFAULT true;

ALTER TABLE mail_inbox_preferences
  ADD COLUMN IF NOT EXISTS "threadViewEnabled" boolean NOT NULL DEFAULT false;

ALTER TABLE mail_inbox_preferences
  ADD COLUMN IF NOT EXISTS "swipePrimaryAction" varchar(16) NOT NULL DEFAULT 'archive';

ALTER TABLE mail_inbox_preferences
  ADD COLUMN IF NOT EXISTS "focusedInboxEnabled" boolean NOT NULL DEFAULT false;

ALTER TABLE mail_inbox_preferences
  ADD COLUMN IF NOT EXISTS "replyQuoteMode" varchar(16) NOT NULL DEFAULT 'full';
