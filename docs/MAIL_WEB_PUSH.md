# Webmail Web Push (G6)

## Ortam

| Değişken | Açıklama |
|----------|----------|
| `MAIL_WEB_PUSH_VAPID_PUBLIC_KEY` | VAPID public (webmail abonelik) |
| `MAIL_WEB_PUSH_VAPID_PRIVATE_KEY` | VAPID private (API gönderim) |
| `MAIL_WEB_PUSH_VAPID_SUBJECT` | `mailto:…` (varsayılan `mailto:admin@lerta.tr`) |
| `MAIL_WEB_PUBLIC_URL` | Bildirim tıklama URL kökü (varsayılan `https://posta.lerta.com.tr`) |

VPS:

```bash
bash scripts/apply-mail-web-push-vps-env.sh /var/www/nakliyeborsasi
```

## API

- `GET company/mail-inbox/push-config` → `{ enabled, publicKey }`
- `POST company/mail-inbox/push/subscribe` → `{ endpoint, p256dh, auth }`
- `POST company/mail-inbox/push/unsubscribe` → `{ endpoint }`

Yeni inbound (spam engelli değil) → org aboneliklerine push.

## Webmail

Ayarlar → **Bildirim** → Bildirimleri aç (tarayıcı izni + service worker).

**iOS / Safari:** Sekmede push yok; iOS 16.4+ için uygulamayı ana ekrana ekleyin. Detay: [MAIL_WEB_PUSH_IOS.md](./MAIL_WEB_PUSH_IOS.md).
