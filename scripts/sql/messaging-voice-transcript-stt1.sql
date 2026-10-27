-- STT-1: sesli mesaj transkriptleri (manuel, KVKK onaylı)
CREATE TABLE IF NOT EXISTS message_voice_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "messageId" uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  "attachmentIndex" integer NOT NULL,
  "requestedByUserId" uuid NOT NULL,
  "requestedByCompanyId" uuid NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending',
  "textBody" text,
  provider varchar(64),
  "kvkkConsentAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_message_voice_transcript UNIQUE ("messageId", "attachmentIndex")
);

CREATE INDEX IF NOT EXISTS idx_message_voice_transcripts_message
  ON message_voice_transcripts ("messageId");
