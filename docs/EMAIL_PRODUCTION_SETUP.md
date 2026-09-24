# E-posta üretim kurulumu (kendi MTA)

Platform kodu (outbox, şablonlar, admin) bu repoda. **Taşıma hattı:** VPS’teki **kendi SMTP/Postfix** — üçüncü taraf ESP yok.

## SMTP profilleri

| `SMTP_PROFILE` | Kullanım | Host |
|----------------|----------|------|
| `mailpit` | Yerel geliştirme | `127.0.0.1:1025` |
| `custom` | **Üretim** — Postfix / kendi MTA | `.env` ile |

## 1. Geliştirme (Mailpit)

```bash
docker compose up -d
SMTP_PROFILE=mailpit
```

## 2. Üretim (VPS Postfix)

1. Sunucu: `bash scripts/setup-postfix-phase-a-lerta.sh` sonra `bash scripts/vps-enable-production-smtp.sh`
2. DNS: [EMAIL_PHASE_A_DNS_ISIMTESCIL.md](EMAIL_PHASE_A_DNS_ISIMTESCIL.md)
3. VPS `.env` (veya `vps-enable-production-smtp.sh`):

```env
EMAIL_ENABLED=true
MAIL_PLATFORM_DOMAIN=mail.lerta.tr
MAIL_PLATFORM_FROM_EMAIL=notifications@mail.lerta.tr
MAIL_PLATFORM_SPF_IPV4=<sunucu IPv4>
MAIL_PLATFORM_DKIM_TXT=<OpenDKIM TXT içeriği>
SMTP_PROFILE=custom
SMTP_HOST=127.0.0.1
SMTP_PORT=25
SMTP_SECURE=false
SMTP_FROM=Lerta Logistics <notifications@mail.lerta.tr>
PLATFORM_ADMIN_EMAILS=admin@lerta.tr,notifications@mail.lerta.tr
WEB_PUBLIC_BASE_URL=https://<siteniz>
```

3. Deploy sonrası: `/admin/bildirimler` → **SMTP doğrula** → **Test gönder**.

## 3. Bounce ve suppression

- SMTP gönderim hataları outbox + `SmtpDeliveryFailureClassifier` ile sınıflandırılır.
- Admin **Politika** sekmesinde suppression listesi.
- Faz C: kendi inbound MX ile bounce webhook (ESP webhook’ları kullanılmaz).

## 4. Operatör e-postası

`/admin` yalnızca `admin@lerta.tr` (ve yapılandırılmış operatör listesi) ile açılır. Eski Gmail operatör hesabı üretimde kullanılmaz.
