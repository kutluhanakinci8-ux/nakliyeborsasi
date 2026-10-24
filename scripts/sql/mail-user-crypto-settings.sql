CREATE TABLE IF NOT EXISTS user_mail_crypto_settings (
  user_id uuid PRIMARY KEY REFERENCES user_account (id) ON DELETE CASCADE,
  pgp_public_key_armored text,
  pgp_key_fingerprint varchar(64),
  smime_certificate_pem text,
  smime_private_key_enc text,
  outbound_sign_smime boolean NOT NULL DEFAULT false,
  compose_prefer_pgp boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_mail_crypto_settings_user
  ON user_mail_crypto_settings (user_id);
