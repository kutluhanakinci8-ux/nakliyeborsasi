ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS legal_hold_at timestamptz;
