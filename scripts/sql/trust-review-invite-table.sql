-- İhale / taşıma sonrası güven değerlendirme daveti (idempotent).
CREATE TABLE IF NOT EXISTS company_trust_review_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "authorCompanyId" uuid NOT NULL,
  "targetCompanyId" uuid NOT NULL,
  "sourceCode" varchar(32) NOT NULL,
  "sourceId" uuid NOT NULL,
  "contextLabel" varchar(240),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "fulfilledAt" timestamptz,
  "dismissedAt" timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_trust_review_invite_source
  ON company_trust_review_invites ("authorCompanyId", "targetCompanyId", "sourceCode", "sourceId");

CREATE INDEX IF NOT EXISTS idx_trust_review_invite_author_pending
  ON company_trust_review_invites ("authorCompanyId")
  WHERE "fulfilledAt" IS NULL AND "dismissedAt" IS NULL;
