# Platform pazarlama e-postası (segment + kampanya)

Mailchimp/HubSpot **lite**: platform operatörü, Nakliyeborsasi kullanıcılarına toplu e-posta.

## Admin UI

`/admin` → Bildirimler → **Pazarlama** sekmesi.

## API (platform-admin)

| Metot | Yol |
|--------|-----|
| GET | `/platform-admin/marketing-email/segments` |
| POST | `/platform-admin/marketing-email/segments` |
| GET | `/platform-admin/marketing-email/segments/:id/preview` |
| GET | `/platform-admin/marketing-email/campaigns` |
| POST | `/platform-admin/marketing-email/campaigns` |
| POST | `/platform-admin/marketing-email/campaigns/:id/send` |
| GET | `/platform-admin/marketing-email/campaigns/:id/analytics` |

## Segment tipleri (`definition`)

| type | Alan |
|------|------|
| `manual` | `emails: string[]` |
| `subscription_plan` | `planCodes: string[]` |
| `participant_type` | `participantTypeCodes: string[]` (ör. `LOAD_CARRIER`) |

İlk açılışta örnek segmentler seed edilir.

## Gönderim

- Outbox `eventCode`: `MARKETING_CAMPAIGN`
- Metadata: `campaignId`, `segmentId`, `abVariant` (`A` \| `B`)
- Açılma/tıklama: mevcut pixel + link wrap
- **Analitik** sekmesi: kampanya KPI + A/B varyant kırılımı

## Veritabanı

`scripts/sql/email-marketing-campaigns.sql`

## Kapsam dışı

Görsel sürükle-bırak editör, çok adımlı otomasyon, HubSpot CRM sync, pazarlama izin yönetimi (KVKK liste ayrı süreç).
