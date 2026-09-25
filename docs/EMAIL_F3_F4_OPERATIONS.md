# F3 / F4 — Politika ve kendi MTA gönderimi

## Ortam (özet)

| Değişken | Açıklama |
|----------|----------|
| `SMTP_PROFILE` | `mailpit` (dev) veya `custom` (üretim Postfix) |
| `SMTP_HOST` / `SMTP_PORT` | Genelde `127.0.0.1:25` (aynı VPS) |
| `SMTP_FROM` | `notifications@mail.lerta.tr` |
| `MAIL_PLATFORM_*` | DNS checklist (SPF IP, DKIM TXT) |
| SPF/DKIM rotasyon | [MAIL_SPF_DKIM_ROTATION_RUNBOOK.md](./MAIL_SPF_DKIM_ROTATION_RUNBOOK.md) |

Üçüncü taraf ESP token’ları ve webhook URL’leri **yok**.

## Bounce / suppression (Faz A üretim)

- SMTP hata yanıtları → outbox `bounceClass` + engagement `bounce` event.
- **hard** ve **spam** sınıfı → otomatik `email_suppressions` (`source=smtp_auto`).
- Yumuşak hatalar: drain yeniden dener (en fazla 8).
- Admin **Politika** sekmesinde manuel suppression.

Detay: [EMAIL_FAZ_A_PRODUCTION.md](./EMAIL_FAZ_A_PRODUCTION.md)

## Admin panel

`/admin/bildirimler` — Operasyon, Analitik, Politika, Platform gönderim (Faz A checklist).
