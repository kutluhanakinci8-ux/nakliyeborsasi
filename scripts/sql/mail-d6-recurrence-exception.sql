CREATE TABLE IF NOT EXISTS mail_calendar_recurrence_exception (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  master_event_id uuid NOT NULL,
  occurrence_starts_at timestamptz NOT NULL,
  cancelled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mail_calendar_recurrence_exception_occ
  ON mail_calendar_recurrence_exception (master_event_id, occurrence_starts_at);

CREATE INDEX IF NOT EXISTS idx_mail_calendar_recurrence_exception_org
  ON mail_calendar_recurrence_exception (organization_id);
