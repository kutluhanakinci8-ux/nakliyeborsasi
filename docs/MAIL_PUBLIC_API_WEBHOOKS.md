# Lerta Mail — Public API ve webhook (F5)

Enterprise tenant entegrasyonu: REST gönderim + olay webhook’ları.

## Plan

`lerta_mail_enterprise_tr` → `mailPublicApiAllowed`  
Pilot: `MAIL_PUBLIC_API_EXTRA_PLAN_CODES=lerta_mail_corporate_tr`

## Kimlik doğrulama

```http
Authorization: Bearer lerta_mail_live_…
```

veya `X-Lerta-Mail-Api-Key: lerta_mail_live_…`

Anahtarlar konsolda **Entegrasyon** veya `POST company/mail-identity/integration/api-keys` (tek seferlik tam anahtar yanıtta).

## Public API

Temel yol: `/api/v1/public/lerta-mail/v1`

| Metot | Yol | Açıklama |
|--------|-----|----------|
| GET | `/organization` | `organizationId`, plan |
| POST | `/messages` | `{ to, subject, html?, text?, idempotencyKey? }` |
| GET | `/messages/:id` | Outbox durumu |

Gönderim varsayılan gönderen domain + kota / askı kontrollerini kullanır (`companyId` metadata).

## Webhook

Konsol: `/integration` veya `POST/PATCH company/mail-identity/integration/webhooks`.

Olaylar:

- `message.sent` / `message.failed` — Public API ile kuyruğa alınan mesajlar
- `inbound.received` — Posta kutusuna gelen mesaj

İstek gövdesi:

```json
{
  "id": "uuid",
  "type": "message.sent",
  "createdAt": "ISO-8601",
  "data": { }
}
```

İmzalar:

- `X-Lerta-Mail-Timestamp` — unix saniye
- `X-Lerta-Mail-Signature` — `HMAC-SHA256(secret, timestamp + "." + rawBody)` hex
- `X-Lerta-Mail-Event` — olay tipi

Webhook URL varsayılan **https** (`MAIL_WEBHOOK_ALLOW_HTTP=true` yalnızca test).

## Denetim

`MAIL_INTEGRATION_API_KEY_*`, `MAIL_INTEGRATION_WEBHOOK_*`

## Veritabanı

- `mail_organization_api_key` (hash)
- `mail_organization_webhook_endpoint` (imza secret sunucuda)

İlgili: [MAIL_WHITE_LABEL_ENTERPRISE.md](./MAIL_WHITE_LABEL_ENTERPRISE.md), [LERTA_MAIL_PRODUCT_ROADMAP.md](./LERTA_MAIL_PRODUCT_ROADMAP.md) F5.
