# Gmail tarzı OSS listesi — Lerta için sınıflandırma

Kaynak: kullanıcı listesi (127 satır, `libwebm` ile biter) + tipik Gmail/Android devamı (zlib … WebRTC).

## Entegrasyon durumu

| Durum | Anlam |
|-------|--------|
| **W1 ✓** | Lisanslar ekranı + kodda kullanımda |
| **W2 ✓** | Lisanslar ekranı + kodda kullanımda |
| **W3–W8** | `docs/oss/LERTA_OSS_PHASED_PLAN.md` |
| **Mobil** | Faz W6 — otomatik OSS merge |
| **Hayır** | Bu ürün için eklemeyin |

Tam faz planı: **`docs/oss/LERTA_OSS_PHASED_PLAN.md`** · Registry: **`docs/oss/lerta-oss-registry.json`**

---

## A — W1 (tamamlandı)

address-formatting (address_sorting), Zstandard, zlib, React, Next.js, OpenPGP.js, SimpleWebAuthn.

---

## B — W2 (bu tur)

| Gmail adı | npm / Node | Kullanım |
|-----------|------------|----------|
| **jutf7** / utf7 | `utf7` | IMAP modified UTF-7 özel klasör adları |
| **libPhoneNumber** | `libphonenumber-js` | Kişi telefon doğrulama / E.164 |
| **Brotli** | `zlib.brotli*` (Node) | API JSON `X-Lerta-Encoding: br` (zstd sonrası) |

---

## C — Liste (127 satır) — özet karar

| Kalem | Karar |
|-------|--------|
| Abseil, angle, dawn, emdawnwebgpu, glslang, Filament, Skia… | Hayır (Chromium GPU) |
| AndroidX, Kotlin, IGListKit, Dagger, Guice | Mobil |
| address_sorting | W1 ✓ (address-formatter) |
| AOSP unified email | Referans only |
| AppAuth | Mobil OAuth (W3) |
| Firebase, gRPC, Gson | Mobil / opsiyonel API |
| BoringSSL, c-ares, expat | Altyapı / Node |
| Brotli | **W2 ✓** |
| bzip2 | Opsiyonel arşiv |
| libaom, libvpx, dav1d, libwebm | Video (WebRTC fazı) |
| libjpeg-turbo, giflib, freetype, harfbuzz | Medya önizleme |
| ICU4C, Joda-Time | Intl (JS Intl) |
| jutf7 | **W2 ✓** |
| json, JsonCpp | JSON (native JsonCpp hayır) |
| libphonenumber | **W2 ✓** |
| Eigen, LAPACK, gemmlowp, Edge TPU, Halide | ML — hayır |
| Closure Library | Hayır |

---

## D — Tipik devam (128+, Gmail tam liste)

| Kalem | Karar |
|-------|--------|
| **zlib** | W1 ✓ |
| **zstd** / Zstandard | W1 ✓ |
| **protobuf** | gRPC seçilirse mobil/API |
| **okhttp / okhttp3** | Android only |
| **React Native**, **Hermes**, **Folly** | Mobil |
| **WebRTC**, **libSRTP** | Görüntülü görüşme |
| **OpenSSL** | Node TLS |
| **skia**, **webkit** | Tarayıcı gömülü |
| **re2**, **icu** | Chromium / Intl |
| **curl**, **nghttp2** | Native istemci hayır |

---

## Sonraki fazlar (özet)

| Faz | İçerik |
|-----|--------|
| **W3** | DOMPurify, web-push, ws (katalog + kod) |
| **W4** | nodemailer, API zstd (katalog) |
| **W5** | Leaflet + mesajlaşma web Legal |
| **W6** | Mobil RN/FCM/AppAuth — SBOM merge |
| **W7–W8** | Medya, WebRTC |

Detay: `LERTA_OSS_PHASED_PLAN.md`.

Güncelleme: `npm run oss:verify-catalog` · SBOM: `npm run oss:sbom`
