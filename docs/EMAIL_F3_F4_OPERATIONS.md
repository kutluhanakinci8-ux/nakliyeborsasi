# F3 / F4 — Politika ve kendi MTA gönderimi

## Ortam (özet)

| Değişken | Açıklama |
|----------|----------|
| `SMTP_PROFILE` | `mailpit` (dev) veya `custom` (üretim Postfix) |
| `SMTP_HOST` / `SMTP_PORT` | Genelde `127.0.0.1:25` (aynı VPS) |
| `SMTP_FROM` | `notifications@mail.lerta.tr` |
| `MAIL_PLATFORM_*` | DNS checklist (SPF IP, DKIM TXT) |

Üçüncü taraf ESP token’ları ve webhook URL’leri **yok**.

## Bounce / suppression

- SMTP hata yanıtları → outbox `bounceClass` + suppression kuralları.
- Admin **Politika** sekmesinde manuel suppression.

## Admin panel

`/admin/bildirimler` — Operasyon, Analitik, Politika, Platform gönderim (Faz A checklist).
