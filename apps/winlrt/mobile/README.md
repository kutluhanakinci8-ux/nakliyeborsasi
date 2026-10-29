# WinLRT Mobile (Android + iOS)

Expo uygulaması: `com.lerta.winlrt` — WebView + `@nakliyeborsasi/core/ltr`.

## W3 — Android

- [x] Expo iskelet + `.ltr` VIEW / SEND intent
- [x] CI typecheck + core build
- [ ] EAS → Google Play internal testing (hesap + `eas submit`)

## Geliştirme

```bash
cd apps/winlrt/mobile
npm install   # repo kökünden npm ci
npm run validate
npx expo start
```

## Play yayını

Bkz. [WINLRT_W3_ANDROID_BUILD.md](../../../docs/WINLRT_W3_ANDROID_BUILD.md)

Vitrin: Play linki (APK yok) — `winlrtSoftwareCatalog.ts` → `winlrt-android`.
