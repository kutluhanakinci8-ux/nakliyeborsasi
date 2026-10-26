# Lerta açık kaynak lisans planı (web → mobil)

## Faz W — Web (şimdi)

| Katman | Ne yapıyoruz |
|--------|----------------|
| **Ayarlar → Lisanslar** | W1 kataloğu: Next.js, React, OpenPGP.js, SimpleWebAuthn, Zstandard, zlib (`mailOpenSourceLicensesCatalog.ts`) |
| **SBOM** | `npm run oss:sbom` → `docs/oss/mail-web-sbom.json` (tüm mail-web transitive npm) |
| **Doğrulama** | `npm run oss:verify-catalog` — W1 paketleri lockfile'da var mı |

### W2 (web genişleme — sıradaki ekler)

- `web-push` (MPL-2.0) — mesajlaşma bildirim sunucusu (platform SBOM veya alt bölüm)
- HTML mail sanitizer (ör. isomorphic-dompurify)
- Leaflet (`apps/web` harita)
- Grafik kütüphanesi (mesajlaşma istatistik UI)

## Faz M — Mobil (Expo / React Native)

Mobil yayınlanmadan **Lisanslar ekranına yüzlerce satır elle eklenmez**.

1. **Android:** Gradle `oss-licenses-plugin` veya `aboutlibraries` — APK içi liste
2. **iOS:** `Settings.bundle` / SwiftUI Legal veya üçüncü taraf OSS ekranı
3. **Paylaşılan API:** Posta + mesajlaşma aynı backend; mobil istemci SBOM ayrı dosya (`docs/oss/mobile-sbom.json` gelecekte)

### Mobilde beklenen ek kategoriler (Gmail benzeri ölçek)

- React Native, Hermes, Expo modülleri
- FCM / push native
- Kamera/mikrofon (görüntülü konuşma) → WebRTC native yığını
- Offline posta önbelleği → Zstd (web ile aynı aile)

### Bilinçli olarak mobilde aranmayacaklar (web-first)

- Abseil, AndroidX Compose (Gmail Android'e özgü; RN kullanıyorsanız farklı liste)
- Cronet (Google); RN'de fetch + TLS stack farklı

## Komutlar

```bash
npm run oss:sbom
npm run oss:verify-catalog
```
