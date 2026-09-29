-- Taşıma / CMR onayı sonrası güven daveti (idempotent).
ALTER TABLE auction_sessions
  ADD COLUMN IF NOT EXISTS "transportCompletedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "transportCompletedByCompanyId" uuid,
  ADD COLUMN IF NOT EXISTS "transportCompletionNote" varchar(512),
  ADD COLUMN IF NOT EXISTS "transportConfirmReminderSentAt" timestamptz;

ALTER TABLE company_trust_review_invites
  ADD COLUMN IF NOT EXISTS "reminderSentAt" timestamptz;
