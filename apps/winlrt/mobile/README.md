# WinLRT Mobile (Android + iOS)

Expo: **`com.lerta.winlrt`** — WebView + `@nakliyeborsasi/core/ltr`.

## W3 — Android

- [x] VIEW / SEND intent · CI
- [ ] Google Play internal test (`eas submit`)

Bkz. [WINLRT_W3_ANDROID_BUILD.md](../../../docs/WINLRT_W3_ANDROID_BUILD.md)

## W4 — iOS

- [x] UTType + Dosyalar entegrasyonu · CI (paylaşımlı mobile workflow)
- [ ] TestFlight / App Store (`eas build -p ios`)
- [ ] Share Extension v0 (native target, opsiyonel)

Bkz. [WINLRT_W4_IOS_BUILD.md](../../../docs/WINLRT_W4_IOS_BUILD.md)

## Geliştirme

```bash
npm ci
npm run validate -w @lerta/winlrt-mobile
cd apps/winlrt/mobile && npx expo start
```

Vitrin: `winlrtSoftwareCatalog.ts` — Play / App Store linkleri (APK/IPA yok).
