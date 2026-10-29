# WinLRT W3 — Android (Expo)

Uygulama: `apps/winlrt/mobile` · paket **`com.lerta.winlrt`**.

## Özellikler

- `@nakliyeborsasi/core` ile LTR doğrulama + HTML render
- `react-native-webview` önizleme
- Android `VIEW` / `SEND` intent (WhatsApp, Dosyalar)
- Manuel açma: `expo-document-picker`

## Yerel

```bash
npm ci
npm run validate -w @lerta/winlrt-mobile
cd apps/winlrt/mobile && npx expo start --android
```

## EAS → Play internal test

1. [Expo](https://expo.dev) projesi oluşturun; `app.json` → `extra.eas.projectId` güncelleyin.
2. `eas login` · `eas build -p android --profile production`
3. `eas submit -p android --profile production` (Play Console service account)
4. Vitrin: `apps/mail-marketing/src/lib/winlrtSoftwareCatalog.ts` → `winlrt-android`  
   `available: true`, `href`: Play mağaza veya internal test URL’si (`external: true`).

Site **APK dağıtmaz** — yalnızca Play linki (roadmap W3).

## CI

`.github/workflows/winlrt-android.yml` — core build + mobile typecheck.

Deploy: **Deploy WinLRT vitrin** (mail-marketing); API/posta/mesaj yok.
