# Firma sohbeti — Zapier / Make (FS-6)

FS-5 outbound webhook + FS-6 automation catalog ile Zapier ve Make tetikleyicileri kurulur.

## Tetikleyici (Zapier)

1. Zapier → **Webhooks by Zapier** → **Catch Hook**
2. Lerta panel → `POST /api/v1/messaging/integration/webhooks` (firma yöneticisi JWT)
   - `url`: Zapier catch URL
   - `events`: `["message.created"]`
3. İmza doğrulama: `x-lerta-messaging-signature` (HMAC, mail webhook ile aynı algoritma)

## Tetikleyici (Make)

1. Make → **Custom webhook** modülü
2. Lerta webhook URL’sini Make URL olarak kaydedin
3. HTTP modülünde `x-lerta-messaging-event` ve gövde `type` alanını filtreleyin

## Katalog API

`GET /api/v1/messaging/integration/automation-catalog` — JWT gerekmez (public metadata; üretimde rate limit önerilir)

## Aksiyon (yazma)

- Bot token: `lerta_msg_bot_live_*` (`POST /messaging/integration/bots`)
- veya mail API anahtarı + `messaging:write` scope
- `POST /api/v1/public/lerta-messaging/v1/threads/{threadId}/messages`
