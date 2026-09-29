-- FS-11: operasyon hızı — işlem damgaları + org şablonları
ALTER TABLE company_messaging_settings
  ADD COLUMN IF NOT EXISTS org_quick_reply_templates jsonb;

COMMENT ON COLUMN company_messaging_settings.org_quick_reply_templates IS
  'FS-11: şirket özel hazır şablonlar (max 20, JSON dizi)';

CREATE TABLE IF NOT EXISTS message_operation_stamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL,
  stamp_type varchar(16) NOT NULL,
  stamped_by_user_id uuid NOT NULL,
  stamped_by_company_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_operation_stamps_type_chk CHECK (
    stamp_type IN ('approved', 'rejected', 'acknowledged')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS message_operation_stamps_message_company_uidx
  ON message_operation_stamps (message_id, stamped_by_company_id);

CREATE INDEX IF NOT EXISTS message_operation_stamps_thread_idx
  ON message_operation_stamps (thread_id);
