# Platform markası (Lerta Logistics)

## E-posta adresleri

- **admin@lerta.tr** — platform operatörü (`/admin` girişi, seed owner).
- **notifications@mail.lerta.tr** — transactional bildirim From, genel iletişim (`PLATFORM_PRIMARY_CONTACT_EMAIL`).

`PLATFORM_ADMIN_EMAILS` virgülle ayrılmış admin bildirim alıcıları.

## Admin konsol erişimi

`/admin` yalnızca `isPlatformOperatorEmail` ile eşleşen adreslerle açılır (`admin@lerta.tr`, `notifications@mail.lerta.tr`).

## Üretim `.env` örneği

```env
PLATFORM_ADMIN_EMAILS=admin@lerta.tr,notifications@mail.lerta.tr
SMTP_FROM=Lerta Logistics <notifications@mail.lerta.tr>
MAIL_PLATFORM_DOMAIN=mail.lerta.tr
MAIL_PLATFORM_FROM_EMAIL=notifications@mail.lerta.tr
```

Gönderim: **kendi VPS MTA** — harici ESP veya Gmail relay kullanılmaz.
