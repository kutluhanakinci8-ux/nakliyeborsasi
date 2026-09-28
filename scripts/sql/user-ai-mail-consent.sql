ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS ai_mail_assist_consent boolean NOT NULL DEFAULT false;

ALTER TABLE user_notification_preferences
  ADD COLUMN IF NOT EXISTS ai_mail_assent_at timestamptz;
