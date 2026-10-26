-- Mesajlar — Expo / FCM push token (TYPEORM_SYNCHRONIZE=false)
CREATE TABLE IF NOT EXISTS messaging_expo_push_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "companyId" uuid NOT NULL,
  "expoPushToken" text NOT NULL,
  platform varchar(16) NOT NULL,
  "userAgent" varchar(255),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_messaging_expo_push_user_token"
  ON messaging_expo_push_token ("userId", "expoPushToken");
