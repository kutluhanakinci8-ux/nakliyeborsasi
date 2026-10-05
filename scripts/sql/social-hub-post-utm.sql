-- Faz 4: yayın UTM parametreleri (prod manual apply when TYPEORM_SYNCHRONIZE=false)

ALTER TABLE company_social_posts
  ADD COLUMN IF NOT EXISTS utm_params_json TEXT NULL;
