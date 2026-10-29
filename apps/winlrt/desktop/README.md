# WinLRT Desktop (Windows + macOS)

**Stack (plan):** Tauri 2 + React + `@nakliyeborsasi/core/ltr`

## W1 — Windows

- [x] Tauri 2 + React viewer (`apps/winlrt/desktop`)
- [x] `.ltr` dosya ilişkilendirme (tauri.conf)
- [x] GitHub Actions Windows build
- [x] MSI vitrinde yayın (`public/downloads/winlrt/`)

## W2 — macOS

- [x] Tauri macOS build + UTType `com.lerta.document.ltr`
- [x] GitHub Actions DMG build
- [ ] Notarization (Apple Developer — üretim)
- [x] DMG vitrinde yayın (`public/downloads/winlrt/`)

Bkz. [WINLRT_W1_WINDOWS_BUILD.md](../../../docs/WINLRT_W1_WINDOWS_BUILD.md) · [WINLRT_W2_MACOS_BUILD.md](../../../docs/WINLRT_W2_MACOS_BUILD.md)

## W5 — Author v1

- [x] Core şablonlar (teklif, kapasite, rota) + `sealLtrDocumentHtml`
- [x] Desktop: şablon çubuğu + Kaydet
- [x] Vitrin: `winlrtReleaseMeta.ts` + şablon `.ltr` indirmeleri

Bkz. [WINLRT_W5_AUTHOR_BUILD.md](../../../docs/WINLRT_W5_AUTHOR_BUILD.md)
