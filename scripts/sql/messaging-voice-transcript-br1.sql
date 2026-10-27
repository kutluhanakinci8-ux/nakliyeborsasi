ALTER TABLE message_voice_transcripts
  ADD COLUMN IF NOT EXISTS transcript_source varchar(32) NOT NULL DEFAULT 'manual';

ALTER TABLE message_voice_transcripts
  ADD COLUMN IF NOT EXISTS bridge_platform varchar(32) NULL;

COMMENT ON COLUMN message_voice_transcripts.transcript_source IS
  'manual | outbound_auto | bridge_inbound';
COMMENT ON COLUMN message_voice_transcripts.bridge_platform IS
  'TELEGRAM | WHATSAPP_CLOUD vb. — bridge_inbound için';
