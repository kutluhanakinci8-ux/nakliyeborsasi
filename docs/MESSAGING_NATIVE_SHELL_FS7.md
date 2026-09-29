# FS-7C — Native shell (Capacitor) yol haritası

Mevcut **PWA** (`apps/web`, `messaging-push-sw.js`) üretimde çalışır. FS-7C, isteğe bağlı **Capacitor** sarmalayıcı ile mağaza dağıtımı için başlangıç noktasıdır.

## Önkoşul

- `npm run build -w @nakliyeborsasi/web`
- HTTPS origin: `https://app.lerta.com.tr`

## Başlangıç (lokal)

```bash
cd apps/web
npx @capacitor/cli init "Lerta" com.lerta.app --web-dir=out
npx cap add android
# iOS için macOS + Xcode gerekir
```

`capacitor.config.ts` içinde `server.url` ile prod veya staging’e işaret edilebilir (geliştirme); mağaza build’inde `webDir` ile gömülü statik çıktı kullanın.

## Push

Firma sohbeti push: `MESSAGING_WEB_PUSH_VAPID_*` (bkz. [MESSAGING_WEB_PUSH.md](./MESSAGING_WEB_PUSH.md)). Capacitor’da FCM/APNs köprüsü ayrı fazdır (FS-7C+).

## Doğrulama

- PWA: `bash scripts/verify-messaging-web-push-prod.sh`
- API: `/messaging/status` → `native_shell_capacitor_docs`
