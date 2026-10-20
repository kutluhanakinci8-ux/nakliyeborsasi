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
| GET | `/campaigns` | Kampanya listesi (`limit`, `status`) |
| GET | `/campaigns/:campaignId` | Kampanya durumu ve sonuç |
| POST | `/campaigns/:campaignId/clone` | `mode: schedule` + `scheduleAt` ile kopya |

## POST `/campaigns`

- En fazla **25** alıcı
- `subject`, `text`, `html` (isteğe bağlı)
- `subjectB` — A/B konu (2., 4. alıcı…)
- `recipientDomainAllowlist` — alan adı filtresi
- `segment` — `{ referansPrefix, referansEquals, requireMusteriAdi, referansAllowlist }`
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

Başarısız HTTP veya ağ hatalarında uç nokta **3 denemeye** kadar otomatik yeniden denenir (2 sn ve 5 sn aralıklarla). Her deneme `mail_webhook_delivery_log` tablosuna yazılır (konsol → Entegrasyon).

## Kampanya klonlama (web oturumu)

`POST company/mail-inbox/campaigns/:id/clone` — `mode: "compose"` yaz ekranını doldurur; `mode: "schedule"` + `scheduleAt` yeni zamanlanmış kampanya oluşturur.

## Segment önizleme

`POST company/mail-inbox/compose/campaign/preview-segment` — alıcı listesi + segment/domain filtreleri için `matched` / `skipped*` sayıları (durdurulmuş liste dahil).

## CSV dışa aktarma

`GET company/mail-inbox/campaigns/:id/export.csv` — alıcı bazlı durum (UTF-8 BOM).
