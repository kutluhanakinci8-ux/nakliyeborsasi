-- STT-2: gelişmiş transkript (dil, güven, düzenleme, arama)
ALTER TABLE message_voice_transcripts
  ADD COLUMN IF NOT EXISTS language_code varchar(8),
  ADD COLUMN IF NOT EXISTS confidence_score double precision,
  ADD COLUMN IF NOT EXISTS edited_text_body text,
  ADD COLUMN IF NOT EXISTS edited_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS search_text text;

CREATE INDEX IF NOT EXISTS idx_message_voice_transcripts_search
  ON message_voice_transcripts USING gin (to_tsvector('simple', coalesce(search_text, '')));
