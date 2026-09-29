ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS thread_kind varchar(16) NOT NULL DEFAULT 'pair',
  ADD COLUMN IF NOT EXISTS title varchar(120);

CREATE TABLE IF NOT EXISTS message_thread_participants (
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_message_thread_participants_company
  ON message_thread_participants (company_id);

INSERT INTO message_thread_participants (thread_id, company_id)
SELECT id, "companyAId" FROM message_threads
ON CONFLICT DO NOTHING;

INSERT INTO message_thread_participants (thread_id, company_id)
SELECT id, "companyBId" FROM message_threads
ON CONFLICT DO NOTHING;

ALTER TABLE company_messaging_settings
  ADD COLUMN IF NOT EXISTS whatsapp_notify_e164 varchar(24),
  ADD COLUMN IF NOT EXISTS whatsapp_bridge_enabled boolean NOT NULL DEFAULT false;
