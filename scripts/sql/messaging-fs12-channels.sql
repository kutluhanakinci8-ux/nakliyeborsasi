-- FS-12: kanal ve mağaza — grup katılımcı rolleri + WA KVKK onay zamanı
ALTER TABLE message_thread_participants
  ADD COLUMN IF NOT EXISTS participant_role varchar(16) NOT NULL DEFAULT 'observer';

ALTER TABLE message_thread_participants
  DROP CONSTRAINT IF EXISTS message_thread_participants_role_chk;

ALTER TABLE message_thread_participants
  ADD CONSTRAINT message_thread_participants_role_chk CHECK (
    participant_role IN ('shipper', 'carrier', 'agent', 'observer')
  );

COMMENT ON COLUMN message_thread_participants.participant_role IS
  'FS-12: yükleyici/nakliyeci/acente/gözlemci (grup sohbet)';

ALTER TABLE company_messaging_settings
  ADD COLUMN IF NOT EXISTS whatsapp_bridge_kvkk_accepted_at timestamptz;

COMMENT ON COLUMN company_messaging_settings.whatsapp_bridge_kvkk_accepted_at IS
  'FS-12: WA bildirim köprüsü KVKK bilgilendirme onayı';
