# Harici istemci SMTP (G9)

Webmail **Ayarlar → IMAP** ekranı, gelen (IMAP) ve giden (SMTP) bilgilerini `GET company/mail-inbox/imap-settings` ile sunar.

## Varsayılanlar

| Alan | Env | Varsayılan |
|------|-----|------------|
| SMTP host | `MAIL_CLIENT_SMTP_HOST` | `MAIL_IMAP_HOST` veya `mail.lerta.tr` |
| SMTP port | `MAIL_CLIENT_SMTP_PORT` | `587` |
| Güvenlik | `MAIL_CLIENT_SMTP_SECURITY` | `starttls` (port 465 ise `ssl`) |

Kimlik doğrulama: kurumsal e-posta + **IMAP şifresi** (webmailde rotate).

## Pilot notları

- Postfix submission (587) ve Dovecot SASL aynı passwd dosyasına bağlı olmalı.
- **Gönderilen** klasörü IMAP’te her zaman dolu değil; webmail gönderilen kutusu güvenilir kaynak.

## İlgili

- [MAIL_THUNDERBIRD_IMAP.md](./MAIL_THUNDERBIRD_IMAP.md)
