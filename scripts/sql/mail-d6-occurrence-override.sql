ALTER TABLE mail_calendar_recurrence_exception
  ADD COLUMN IF NOT EXISTS override_title varchar(200) NULL;

ALTER TABLE mail_calendar_recurrence_exception
  ADD COLUMN IF NOT EXISTS override_starts_at timestamptz NULL;

ALTER TABLE mail_calendar_recurrence_exception
  ADD COLUMN IF NOT EXISTS override_ends_at timestamptz NULL;

ALTER TABLE mail_calendar_recurrence_exception
  ADD COLUMN IF NOT EXISTS override_all_day boolean NULL;
