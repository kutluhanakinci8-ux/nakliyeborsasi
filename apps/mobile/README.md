# Mobile (Expo)

Bu klasör kök npm workspaces listesinde değil (VPS web build ile React sürüm çakışmasını önlemek için).

## Geliştirme

```bash
cd apps/mobile
npm install
npx expo start
```

Ana ekranda **Açık kaynak lisansları** — `assets/lerta-legal-notices.json` (W6).

## OSS (repo kökünden)

```bash
npm run oss:sbom:mobile
npm run oss:merge-legal
# veya
npm run oss:mobile
```

Android Gradle `oss-licenses-plugin` — üretim APK fazında eklenecek (`docs/oss/MOBILE-ANDROID-OSS.md`).
