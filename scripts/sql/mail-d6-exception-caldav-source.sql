ALTER TABLE mail_calendar_recurrence_exception
  ADD COLUMN IF NOT EXISTS from_caldav boolean NOT NULL DEFAULT false;

ALTER TABLE mail_calendar_recurrence_exception
  ADD COLUMN IF NOT EXISTS caldav_occurrence_pushed_at_ms bigint NULL;
