# Lerta Mail Public API (v1)

Base URL: `https://<api-host>/api/v1/public/lerta-mail/v1`

## Kimlik doğrulama

- `Authorization: Bearer <api-key>`
- veya `X-Lerta-Mail-Api-Key: <api-key>`

API anahtarları posta konsol → Entegrasyon üzerinden oluşturulur.

## Uç noktalar

| Metot | Yol | Açıklama |
|-------|-----|----------|
| GET | `/docs` | Makine okunur özet |
| GET | `/organization` | Plan kodu |
| POST | `/messages` | Tek alıcı (outbox) |
| GET | `/messages/:id` | Gönderim durumu |
| POST | `/campaigns` | Pazarlama kampanyası |

## POST `/campaigns`

- En fazla **25** alıcı
- `subject`, `text`, `html` (isteğe bağlı)
- `subjectB` — A/B konu (2., 4. alıcı…)
- `recipientDomainAllowlist` — alan adı filtresi
- `segment` — `{ referansPrefix, referansEquals, requireMusteriAdi }`
- `scheduleAt` — ISO 8601 (1 dk – 7 gün)
- `reminderMinutesBefore` — zamanlanmış kampanyada gönderimden önce hatırlatma (5–1440 dk)
- `delayMsBetweenRecipients` — 0–2000 ms

Yanıt: `campaignId`, `scheduled`, `sent`, `failed`, …

## Webhook olayları (kampanya)

Konsolda webhook uç noktasına abone olun:

- `campaign.scheduled`
- `campaign.reminder`
- `campaign.started`
- `campaign.completed`
- `campaign.failed`
- `campaign.cancelled`

İmza: `X-Lerta-Mail-Signature` (HMAC, mevcut mesaj webhook’ları ile aynı).
