# WinLRT W2 — macOS build

Aynı Tauri projesi: `apps/winlrt/desktop`. macOS’ta `.ltr` **UTType** `com.lerta.document.ltr` (`tauri.conf.json` → `exportedType`).

## Geliştirici (Mac)

```bash
cd apps/winlrt/desktop
npm install
npm run tauri dev
```

## Release (DMG)

```bash
npm run tauri:build:mac
```

Çıktı: `src-tauri/target/release/bundle/dmg/*.dmg`

## Notarization

Üretim dağıtımı için Apple Developer imzası + notarization gerekir (CI’da secrets yok — vitrin **ad-hoc / imzasız DMG** beta).

## CI

`.github/workflows/winlrt-macos.yml` — `main` push sonrası DMG artefakt.

## Vitrin

DMG `apps/mail-marketing/public/downloads/winlrt/` altına konur; `winlrtSoftwareCatalog.ts` → `winlrt-macos` `available: true`.

Vitrin-only deploy: `scripts/agent-merge-deploy-winlrt-vitrin.sh` veya GitHub **Deploy WinLRT vitrin**.
