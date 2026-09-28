-- Platform pazarlama e-postası: segment + kampanya (Mailchimp sınıfı)
CREATE TABLE IF NOT EXISTS email_marketing_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(128) NOT NULL,
  definition jsonb NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL,
  "segmentId" uuid NOT NULL,
  "subjectA" varchar(255) NOT NULL,
  "subjectB" varchar(255),
  "abTestEnabled" boolean NOT NULL DEFAULT false,
  "htmlBody" text NOT NULL,
  "textBody" text NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'draft',
  "recipientsTargeted" int NOT NULL DEFAULT 0,
  "recipientsEnqueued" int NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "sentAt" timestamptz
);

CREATE INDEX IF NOT EXISTS "IDX_email_marketing_campaigns_segment"
  ON email_marketing_campaigns ("segmentId");
