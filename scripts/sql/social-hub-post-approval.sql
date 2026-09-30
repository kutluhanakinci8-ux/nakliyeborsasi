-- Faz B: onay alanları (prod manual apply when TYPEORM_SYNCHRONIZE=false)

ALTER TABLE company_social_posts
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID NULL;
