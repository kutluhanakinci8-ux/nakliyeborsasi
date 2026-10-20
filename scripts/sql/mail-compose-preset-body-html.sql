ALTER TABLE mail_compose_preset
  ADD COLUMN IF NOT EXISTS body_html text;
