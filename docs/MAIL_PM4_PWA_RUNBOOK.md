# PM-4 — PWA / offline / push runbook

## Kod
- Service worker: `apps/mail-web/public/sw.js` — shell cache `lerta-mail-shell-v7`
- IndexedDB: `lerta-mail-offline-v1` — son **50** liste satırı + **25** mesaj detayı (salt okunur yedek)
- Çevrimdışı: `fetchInboxWithOfflineCache` / `fetchMessageWithOfflineCache` (`mailOfflineCache.ts`)

## VPS doğrulama

```bash
bash scripts/verify-mail-web-push-prod.sh
bash scripts/verify-mail-web-pwa-prod.sh
```

Push abonelik: posta.lerta.com.tr → Ayarlar → Bildirimler → **Push etkinleştir** (VAPID tanımlı olmalı).

## iOS / Android
- iOS: Ana ekrana ekle → push için sistem izni gerekir (Safari PWA kısıtları dokümante).
- Android: `beforeinstallprompt` (mail-web) + Chrome push.
