-- Odaklı gelen kutusu AI sınıflandırması (focus | other)
ALTER TABLE mail_inbound_message
  ADD COLUMN IF NOT EXISTS ai_focus_lane VARCHAR(16) NULL;

CREATE INDEX IF NOT EXISTS idx_mail_inbound_ai_focus_lane
  ON mail_inbound_message (mailbox_id, ai_focus_lane)
  WHERE ai_focus_lane IS NOT NULL;
