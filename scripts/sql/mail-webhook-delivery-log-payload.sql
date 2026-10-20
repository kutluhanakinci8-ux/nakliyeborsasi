ALTER TABLE mail_webhook_delivery_log
  ADD COLUMN IF NOT EXISTS payload_body text NULL;
