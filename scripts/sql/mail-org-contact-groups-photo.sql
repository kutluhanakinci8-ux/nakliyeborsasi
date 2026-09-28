-- CardDAV grup (CATEGORIES) ve foto (PHOTO) paritesi
ALTER TABLE mail_org_contact
  ADD COLUMN IF NOT EXISTS group_names jsonb;

ALTER TABLE mail_org_contact
  ADD COLUMN IF NOT EXISTS photo_data_url text;
