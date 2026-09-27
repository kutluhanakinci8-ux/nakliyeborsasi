-- Mesajlar P4: ekler + web push (TYPEORM_SYNCHRONIZE=false ortamlar)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachments jsonb;

CREATE TABLE IF NOT EXISTS messaging_web_push_subscription (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "companyId" uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  "userAgent" varchar(255),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_messaging_push_user_endpoint"
  ON messaging_web_push_subscription ("userId", endpoint);
