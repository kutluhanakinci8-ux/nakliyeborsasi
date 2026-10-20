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
| GET | `/campaigns/summary` | Son 30 gün özet + `availableTags` |
| GET | `/campaigns` | Kampanya listesi (`limit`, `offset`, `status`, `tag`, `q`, `createdAfter`, `createdBefore`, `sort`) |
| GET | `/campaigns/export.csv` | Filtrelenmiş liste CSV (en fazla 200 satır) |
| GET | `/campaigns/:campaignId` | Kampanya durumu ve sonuç |
| POST | `/campaigns/:campaignId/clone` | `mode: schedule` + `scheduleAt` ile kopya |
| POST | `/campaigns/:campaignId/reschedule` | Zamanlanmış kampanya — yeni `scheduleAt` |
| POST | `/campaigns/:campaignId/tags` | Etiket güncelle (`running` hariç) |
| POST | `/campaigns/:campaignId/content` | Zamanlanmış kampanya konu/metin |
| POST | `/campaigns/:campaignId/cancel` | Zamanlanmış kampanyayı iptal |
| POST | `/campaigns/:campaignId/resend` | Kampanyayı yeniden gönder (yeni kayıt) |
| POST | `/campaigns/bulk-cancel` | Toplu iptal (max 25 id) |
| POST | `/campaigns/:campaignId/resend-failed` | Yalnızca başarısız alıcılar |
| GET | `/campaigns/:campaignId/export.csv` | Alıcı durum CSV |

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

Kampanya olaylarında gövde alanları: `campaignId`, `subject`, `status`, `scheduleAt`, `createdAt`, `tags`, `recipientCount` (+ `result` tamamlananlarda).

Başarısız HTTP veya ağ hatalarında uç nokta **3 denemeye** kadar otomatik yeniden denenir (2 sn ve 5 sn aralıklarla). Her deneme `mail_webhook_delivery_log` tablosuna yazılır (konsol → Entegrasyon).

## Kampanya klonlama (web oturumu)

`POST company/mail-inbox/campaigns/:id/clone` — `mode: "compose"` yaz ekranını doldurur; `mode: "schedule"` + `scheduleAt` yeni zamanlanmış kampanya oluşturur.

## Segment önizleme

`POST company/mail-inbox/compose/campaign/preview-segment` — alıcı listesi + segment/domain filtreleri için `matched` / `skipped*` sayıları (durdurulmuş liste dahil).

## CSV dışa aktarma

`GET company/mail-inbox/campaigns/:id/export.csv` — alıcı bazlı durum (UTF-8 BOM).

## Faz 12

- `POST …/campaigns/:id/resend-failed` — yalnızca başarısız alıcılar
- Kampanya `tags` (en fazla 8) — web compose ve API
- Konsol: başarısız webhook teslimatını **Yeniden gönder** (`payload_body` kolonu gerekir)

## Faz 13

- `GET /campaigns/summary` — 30 günlük kampanya sayıları, alıcı/gönderim toplamları, etiket listesi
- `GET /campaigns?tag=` — etiket filtresi (küçük harf, payload içinde tam eşleşme)
- Web kampanya geçmişi: özet satırı + etiket filtresi; compose segment önizlemesi otomatik (650 ms gecikme)

## Faz 14

- `GET /campaigns?q=` — konu araması (en az 2 karakter, `ILIKE`)
- `offset` + `pagination.hasMore` — sayfalama (limit max 80, offset max 500)
- Web kampanya geçmişi: konu arama + “Daha fazla göster”; “Gönderiliyor” durum filtresi

## Faz 15

- `POST …/campaigns/:id/reschedule` — mevcut zamanlanmış kampanyayı yeni `scheduleAt` ile güncelle (hatırlatma sıfırlanır, `campaign.scheduled` webhook yeniden)
- Liste: `createdAfter` / `createdBefore` (ISO 8601) oluşturulma aralığı
- Kampanya webhook gövdesi: `tags`, `createdAt`
- Web: zamanlanmış kampanyada **Yeniden zamanla**

## Faz 16

- `POST …/campaigns/:id/tags` — etiket güncelleme (gönderim sırasında hariç)
- `GET …/campaigns/export.csv` — mevcut filtrelerle liste CSV
- Liste `sort=createdAt|scheduleAt` (plan tarihi için `scheduleAt`)
- Özet: `tagCountsInWindow` (30 gün)
- Web: tarih aralığı, sıralama, filtreli liste CSV, kampanya **Etiket** düzenleme

## Faz 17

- Public API: `cancel`, `resend`, `content`, `bulk-cancel`
- Zamanlanmış kampanya içerik düzenleme (`subject`, `text`, `subjectB`) → `campaign.scheduled` webhook
- Özet: `failedRecipientsInWindow`, `suppressedSkippedInWindow`; liste `successRatePercent`
- Web: **İçerik** düzenleme, zamanlanmışlar için **Toplu iptal**
