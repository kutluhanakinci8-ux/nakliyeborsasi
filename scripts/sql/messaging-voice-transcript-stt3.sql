-- STT-3: firma düzeyinde otomatik ses transkripsiyon politikası
ALTER TABLE company_messaging_settings
  ADD COLUMN IF NOT EXISTS voice_transcribe_mode varchar(16) NOT NULL DEFAULT 'manual';

ALTER TABLE company_messaging_settings
  ADD COLUMN IF NOT EXISTS voice_transcribe_auto_kvkk_accepted_at timestamptz NULL;

COMMENT ON COLUMN company_messaging_settings.voice_transcribe_mode IS
  'manual | auto — sesli mesaj gönderiminde otomatik STT (STT-3, flag gerekli)';
COMMENT ON COLUMN company_messaging_settings.voice_transcribe_auto_kvkk_accepted_at IS
  'Firma yetkilisi otomatik STT KVKK onayı zamanı';
