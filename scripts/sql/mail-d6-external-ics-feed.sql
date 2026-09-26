-- Harici iCal URL aboneliği (CalDAV öncesi)
CREATE TABLE IF NOT EXISTS mail_calendar_ics_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  label varchar(120) NOT NULL,
  feed_url varchar(2000) NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz NULL,
  last_sync_error varchar(500) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_calendar_ics_feed_org
  ON mail_calendar_ics_feed (organization_id);

ALTER TABLE mail_calendar_event
  ADD COLUMN IF NOT EXISTS ics_feed_id uuid NULL;

ALTER TABLE mail_calendar_event
  ADD COLUMN IF NOT EXISTS external_uid varchar(320) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_calendar_event_feed_uid
  ON mail_calendar_event (organization_id, ics_feed_id, external_uid)
  WHERE external_uid IS NOT NULL AND ics_feed_id IS NOT NULL;
