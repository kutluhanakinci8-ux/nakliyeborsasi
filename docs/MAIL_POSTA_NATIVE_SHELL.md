# Lerta Posta — native shell (Capacitor)

Tam native Swift/Kotlin uygulama yerine **Capacitor** ile mağaza paketi; içerik `https://posta.lerta.com.tr` veya gömülü statik build.

## Dosyalar

- `apps/mail-web/capacitor.config.ts` — `appId: com.lerta.posta`

## Pilot (canlı URL)

```bash
cd apps/mail-web
export CAPACITOR_POSTA_SERVER_URL=https://posta.lerta.com.tr
npx @capacitor/cli init "Lerta Posta" com.lerta.posta --web-dir=out
npx cap add ios
npx cap add android
npx cap sync
```

`capacitor.config.ts` içindeki `server.url` pilot sırasında canlı posta hostuna işaret eder; mağaza sürümünde `server.url` kaldırılır.

## PWA

Service worker + manifest zaten `apps/mail-web/public/` altında; Capacitor mağaza ikonları `icon-192.png` ile hizalanır.

Bkz. `docs/LERTA_MAIL_PARITY_FAZ28_P3_OFFLINE.md`
