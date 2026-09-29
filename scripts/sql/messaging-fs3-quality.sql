ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS kind varchar(16) NOT NULL DEFAULT 'public';

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS mention_user_ids jsonb;

CREATE TABLE IF NOT EXISTS message_thread_user_read_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  last_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_message_thread_user_read UNIQUE (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_thread_user_read_thread
  ON message_thread_user_read_states (thread_id);
