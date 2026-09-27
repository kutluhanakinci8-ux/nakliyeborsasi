-- S-A2: Otomatik yanıtlar
ALTER TABLE mail_inbox_preferences
  ADD COLUMN IF NOT EXISTS "autoReplyEnabled" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "autoReplyBodyText" text,
  ADD COLUMN IF NOT EXISTS "autoReplyActiveFrom" timestamptz,
  ADD COLUMN IF NOT EXISTS "autoReplyActiveUntil" timestamptz;

CREATE TABLE IF NOT EXISTS mail_auto_reply_throttle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL,
  "senderEmail" varchar(320) NOT NULL,
  "lastSentAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mail_auto_reply_throttle_org_sender"
  ON mail_auto_reply_throttle ("organizationId", "senderEmail");
