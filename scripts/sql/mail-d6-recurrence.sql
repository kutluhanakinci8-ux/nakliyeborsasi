ALTER TABLE mail_calendar_event
  ADD COLUMN IF NOT EXISTS recurrence_rule varchar(500) NULL;

ALTER TABLE mail_calendar_event
  ADD COLUMN IF NOT EXISTS recurrence_until timestamptz NULL;
