-- D6: org takvim + kişiler (mail-web)
CREATE TABLE IF NOT EXISTS mail_calendar_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  title varchar(200) NOT NULL,
  description text NULL,
  location varchar(300) NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  created_by_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_calendar_event_org_starts
  ON mail_calendar_event (organization_id, starts_at);

CREATE TABLE IF NOT EXISTS mail_org_contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  display_name varchar(120) NOT NULL,
  email varchar(320) NULL,
  phone varchar(40) NULL,
  notes varchar(500) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_org_contact_org_name
  ON mail_org_contact (organization_id, display_name);
