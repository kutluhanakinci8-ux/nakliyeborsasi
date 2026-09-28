ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS notify_push_new_offers boolean NOT NULL DEFAULT true;

ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS notify_push_messages boolean NOT NULL DEFAULT true;

ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS notify_push_auctions boolean NOT NULL DEFAULT true;
