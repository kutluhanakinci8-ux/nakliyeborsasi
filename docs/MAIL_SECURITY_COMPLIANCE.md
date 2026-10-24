# Posta — güvenlik ve uyum

## Mevcut katmanlar

| Katman | Durum |
|--------|--------|
| HTTPS / TLS | Üretim zorunlu |
| TOTP 2FA | Giriş + hassas işlemler |
| Passkey / posta kilidi | WebAuthn |
| Roller | `MailAdmin`, `Viewer`, firma sahibi |
| KVKK export | Webmail + konsol |
| Uzak resim politikası | Org tercihi |
| Gönderim denetimi | `audit_logs` + webmail CSV |
| OpenPGP | İsteğe bağlı (alıcı public key) |
| S/MIME imza | `smime.p7s` ek (kullanıcı sertifikası) |

## API

| Metot | Yol |
|-------|-----|
| GET/PATCH | `company/mail-inbox/crypto-settings` |
| GET | `company/mail-inbox/compliance/audit?category=send\|security\|all` |
| GET | `company/mail-inbox/compliance/send-log/export` |

Gönderimler `MAIL_INBOX_*_SENT` kodları ile metadata (`subject`, `to`, `contentProtection`, `kvkkCategory`) yazılır.

## Proton seviyesi E2E

Sıfır-bilgi sunucu modeli **planlı** (ayrı anahtar halkası / istemci-only şifreleme). Bugünkü PGP katmanı içerik şifreler; metadata (alıcı, konu) sunucuda kalır.

## SQL

`scripts/sql/mail-user-crypto-settings.sql`
