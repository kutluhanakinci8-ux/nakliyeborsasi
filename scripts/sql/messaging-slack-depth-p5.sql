-- Mesajlaşma P5: Slack derinliği (kanal, bot, kurumsal arama)
ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS "threadKind" varchar(32) NOT NULL DEFAULT 'b2b',
  ADD COLUMN IF NOT EXISTS "channelSlug" varchar(64),
  ADD COLUMN IF NOT EXISTS "channelName" varchar(128);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS "senderKind" varchar(16) NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS "senderLabel" varchar(128);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_message_threads_org_channel_slug"
  ON message_threads ("companyAId", "channelSlug")
  WHERE "threadKind" = 'org_channel' AND "channelSlug" IS NOT NULL;

CREATE TABLE IF NOT EXISTS messaging_company_bot (
  "companyId" uuid PRIMARY KEY,
  "webhookToken" varchar(128) NOT NULL,
  "botDisplayName" varchar(128) NOT NULL DEFAULT 'Lerta Bot',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_messaging_company_bot_token"
  ON messaging_company_bot ("webhookToken");
