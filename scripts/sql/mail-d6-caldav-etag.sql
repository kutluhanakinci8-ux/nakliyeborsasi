ALTER TABLE mail_calendar_event
  ADD COLUMN IF NOT EXISTS caldav_etag varchar(200) NULL;
