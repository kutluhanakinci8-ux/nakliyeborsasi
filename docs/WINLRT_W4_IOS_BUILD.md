# WinLRT W4 — iOS (Expo)

Uygulama: `apps/winlrt/mobile` · **`com.lerta.winlrt`** (Android ile aynı kod tabanı).

## Özellikler

- UTType **`com.lerta.document.ltr`** (`Info.plist` exported type)
- Dosyalar uygulamasından “WinLRT ile aç” (`LSSupportsOpeningDocumentsInPlace`)
- WebView önizleme + `@nakliyeborsasi/core/ltr`
- **Share Extension v0:** Expo managed workflow’da ayrı extension hedefi yok; TestFlight sonrası native target eklenebilir (bkz. aşağı)

## Yerel (Mac + Xcode isteğe bağlı)

```bash
npm ci
npm run validate -w @lerta/winlrt-mobile
cd apps/winlrt/mobile && npx expo start --ios
```

## EAS → TestFlight → App Store

1. Apple Developer Program · App Store Connect uygulama kaydı (`com.lerta.winlrt`).
2. `eas credentials` · `eas build -p ios --profile production`
3. `eas submit -p ios --profile production` → TestFlight internal
4. Vitrin: `winlrtSoftwareCatalog.ts` → `winlrt-ios`  
   `available: true`, `href`: App Store URL (`external: true`).

## Share Extension (v0 — sonraki adım)

`ShareViewController` + App Group ile `.ltr` paylaşımı; `expo prebuild` sonrası Xcode’da extension target. W4 teslimi: **TestFlight okuma + PDF (yazdır)** — extension opsiyonel.

## CI

`.github/workflows/winlrt-mobile.yml` — Android + iOS aynı TypeScript doğrulaması.

Deploy: **Deploy WinLRT vitrin** (mail-marketing only).
