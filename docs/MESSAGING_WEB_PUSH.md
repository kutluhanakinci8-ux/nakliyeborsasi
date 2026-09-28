# Sohbet Web Push (ayrı VAPID)

Sohbet bildirimleri (`app.lerta.com.tr`) **mail web push** (`posta.lerta.com.tr`) ile **aynı VAPID anahtarını paylaşmaz**. Böylece mail push test/rotate sohbeti bozmaz.

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `MESSAGING_WEB_PUSH_VAPID_PUBLIC_KEY` | Sohbet abonelik (istemci) |
| `MESSAGING_WEB_PUSH_VAPID_PRIVATE_KEY` | API gönderim |
| `MESSAGING_WEB_PUSH_VAPID_SUBJECT` | `mailto:…` (varsayılan `mailto:notifications@mail.lerta.com.tr`) |
| `MESSAGING_WEB_PUBLIC_URL` | Bildirim deep link tabanı (`https://app.lerta.com.tr`) |
| `MESSAGING_WEB_PUSH_ALLOW_MAIL_FALLBACK` | `true` ise eski davranış (mail anahtarı); prod **false** |

Mail tarafı: [MAIL_WEB_PUSH.md](./MAIL_WEB_PUSH.md)

## VPS

```bash
bash scripts/apply-mail-web-push-vps-env.sh /var/www/nakliyeborsasi
bash scripts/apply-messaging-web-push-vps-env.sh /var/www/nakliyeborsasi
bash scripts/verify-mail-web-push-prod.sh /var/www/nakliyeborsasi/.env
bash scripts/verify-messaging-web-push-prod.sh /var/www/nakliyeborsasi/.env
```

Deploy hook: `deploy-production-vps.sh` her iki `apply-*` scriptini çalıştırır.

## API

- `GET /api/v1/messaging/push/config` → `{ enabled, publicKey, isolatedVapid }`
- `POST /api/v1/messaging/push/subscribe` · `unsubscribe`
- Service worker: `apps/web/public/messaging-push-sw.js`

## Teknik not

`web-push` global `setVapidDetails` kullanılmaz; her gönderimde `vapidDetails` ile mail ve sohbet anahtarları çakışmaz (`sendWebPushNotification`).
