# Lerta Mail — TOTP 2FA (E5)

## Kullanıcı TOTP

| Endpoint | Açıklama |
|----------|----------|
| `GET /auth/totp/status` | Durum |
| `POST /auth/totp/setup` | Secret + otpauth URL |
| `POST /auth/totp/confirm` | `{ code }` ile etkinleştir |
| `POST /auth/totp/disable` | `{ password, code }` |

Giriş: `POST /auth/login` → `{ requiresTotp, challengeToken }` veya `{ accessToken }`  
Tamamlama: `POST /auth/login/totp` → `{ accessToken }`

Secret şifreleme: `AUTH_TOTP_ENCRYPTION_KEY` (yoksa `JWT_SECRET`). Issuer: `MAIL_TOTP_ISSUER`.

## Firma politikası

- `GET /company/mail-identity/security` — politika + kullanıcı TOTP (konsol guard: `/security` yolu TOTP politikasından muaf)
- `PATCH /company/mail-identity/security` — `{ requireTotpForConsole }` (firma sahibi)

`require_totp_for_console` on `mail_organization_operator_state`. Açıkken TOTP’siz kullanıcılar `company/mail-inbox` ve mail konsol API’lerine erişemez.

## UI

- Konsol: `/security`, giriş TOTP adımı
- Webmail: giriş TOTP adımı, Ayarlar → 2FA sekmesi

## Veritabanı

`user_accounts`: `totp_secret_ciphertext`, `totp_pending_secret_ciphertext`, `totp_enabled_at`  
Migration veya `TYPEORM_SYNCHRONIZE`.
