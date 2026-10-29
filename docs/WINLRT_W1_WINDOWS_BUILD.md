# WinLRT W1 — Windows build

Bağımsız uygulama: `apps/winlrt/desktop` (Tauri 2 + `@nakliyeborsasi/core/ltr`).

## Geliştirici (Windows)

```powershell
cd apps\winlrt\desktop
npm install
npm run tauri dev
```

## Release (NSIS)

```powershell
npm run tauri:build
```

Çıktı: `src-tauri\target\release\bundle\nsis\*.exe`

## CI

`.github/workflows/winlrt-windows.yml` — `main` push sonrası artefakt.

## Vitrin

Derlenen installer `apps/mail-marketing/public/downloads/winlrt/` altına konur ve
`winlrtSoftwareCatalog.ts` içinde `available: true` yapılır (vitrin-only deploy).

Posta/mesaj API **değişmez**.
