# Android OSS lisansları (W6 sonrası)

Mobil `apps/mobile` npm SBOM: `npm run oss:sbom:mobile`.

APK yayınında ek adım:

1. `com.google.android.gms:oss-licenses-plugin` veya [AboutLibraries](https://github.com/mikepenz/AboutLibraries)
2. `lerta-legal-notices.json` ile senkron (CI: `npm run oss:mobile` önce)

iOS: Settings → Legal veya uygulama içi `OpenSourceLegalScreen` (mevcut).
