ALTER TABLE mail_org_contact
  ADD COLUMN IF NOT EXISTS carddav_etag varchar(200) NULL;
