# Lerta açık kaynak — faz faz plan (web + API, mobil hazırlık)

**Amaç:** Her fazda üç şey birlikte gider:

1. **Yükle** — `package-lock` / SBOM güncel  
2. **Göster** — Posta **Ayarlar → Lisanslar** (+ ileride mesajlaşma web / mobil Legal)  
3. **Kullan** — Gerçek ürün kodunda bağla  

**Kural:** Lisans ekranında yalnızca **o fazda dağıtılan veya API’de aktif kullanılan** bileşenler; Gmail 127 satırın tamamı `lerta-oss-registry.json` içinde **referans**, UI’da özet.

**Komutlar (her faz sonu):**

```bash
npm run oss:verify-catalog
npm run oss:sbom
npm run build -w @nakliyeborsasi/api
npm run build -w @lerta/mail-web
# mesajlaşma web değişti ise: npm run build -w @nakliyeborsasi/web
```

---

## Özet tablo

| Faz | Odak | Lisans sekmesi (yeni) | Kod (ana dokunuş) | Mobil |
|-----|------|------------------------|-------------------|--------|
| **W0** ✓ | SBOM, verify, şema | — | `scripts/*`, tipler | Registry şeması |
| **W1** ✓ | Posta web çekirdeği | 7 kalem | Next, React, PGP, WebAuthn, zstd, zlib, adres | — |
| **W2** ✓ | Gmail parça | +3 (10 toplam) | utf7, libphonenumber, Brotli | jutf7 / libPhoneNumber eşlemesi |
| **W3** ✓ | Güvenli HTML + canlı mesaj | +3 (13 toplam) | DOMPurify, web-push, ws | Push/WebSocket aynı API |
| **W4** | Posta sunucu (görünür) | +2–3 | nodemailer, @mongodb-js/zstd (API) | SMTP/IMAP aynı backend |
| **W5** | Mesajlaşma web | +1–2 | Leaflet, ortak Lisanslar URL | Harita RN’de Mapbox/Maps ayrı |
| **W6** ✓ | Mobil istemci v1 | +4 (22 toplam) | Expo, RN, AppAuth, expo-notifications (FCM) + Legal | `oss:mobile`, merge legal JSON |
| **W7** ✓ | Medya önizleme | +1 (20 toplam) | sharp API + posta ek JPEG önizleme | libjpeg-turbo (sharp/libvips) |
| **W8** ✓ | Görüntülü görüşme | +1 (21 toplam) | WebRTC disclosure + mesajlaşma hub notu | libvpx, libwebm (mobil SBOM) |

---

## W0 ✓ — Altyapı (tamamlandı)

| Öğe | Konum |
|-----|--------|
| Katalog şeması | `mailOpenSourceLicenseTypes.ts` |
| W1/W2 listeler | `mailOpenSourceLicensesCatalog*.ts` |
| SBOM | `docs/oss/mail-web-sbom.json`, `npm run oss:sbom` |
| Doğrulama | `npm run oss:verify-catalog` |
| Gmail sınıflandırma | `docs/oss/GMAIL_OSS_LIST_CLASSIFIED.md` |
| Mobil notu | `docs/OSS-MOBILE-PLAN.md` |
| Registry (faz etiketli) | `docs/oss/lerta-oss-registry.json` |

---

## W1 ✓ — Posta istemci çekirdeği (tamamlandı)

| Katalog ID | Paket / kaynak | Kullanım |
|------------|----------------|----------|
| address-formatting | `@fragaria/address-formatter` | Kurumsal adres, dipnot, yol tarifi |
| nextjs | `next` | posta.lerta.com.tr çatı |
| react | `react`, `react-dom` | UI |
| openpgp | `openpgp` | İstemci PGP |
| simplewebauthn | `@simplewebauthn/browser` | Passkey |
| zstandard | `fzstd`, `zstd-codec` | API JSON + offline önbellek |
| zlib | Node `zlib` | gzip yedek, eDiscovery ZIP |

**Kabul:** 7 katalog kaydı, verify + SBOM, build mail-web.

---

## W2 ✓ — Gmail uyum (tamamlandı)

| Katalog ID | Gmail adı | Kullanım |
|------------|-----------|----------|
| utf7-imap | jutf7 | `imapModifiedUtf7`, özel klasör maildir |
| libphonenumber-js | libPhoneNumber | Kişi E.164 |
| brotli | Brotli | `X-Lerta-Encoding: br` |

**Kabul:** 10 katalog, API vitest (utf7/brotli/phone), canlı deploy.

---

## W3 — Güvenlik + mesajlaşma altyapısı (sıradaki)

**Öncelik:** posta HTML XSS + mesajlaşma bildirim / canlı akış.

### 3.1 Yükle

| Paket | Lisans | Workspace |
|-------|--------|-----------|
| `isomorphic-dompurify` + `dompurify` | MPL-2.0 / Apache-2.0 | `api`, `mail-web` |
| (zaten var) `web-push` | MPL-2.0 | `api` |
| (zaten var) `ws` | MIT | `api` |

### 3.2 Lisans sekmesi (yeni kayıtlar)

| ID | sortName | usageNoteKey (özet) |
|----|----------|---------------------|
| `dompurify` | DOMPurify | Gelen/giden posta HTML; mesaj zengin metin (ileride) |
| `web-push` | web-push | Tarayıcı push (mesajlaşma / posta uyarıları) |
| `ws` | ws | Mesajlaşma WebSocket hub |

`OSS_CATALOG_REQUIRED_PACKAGE_NAMES` → `isomorphic-dompurify`, `dompurify` (verify).

### 3.3 Kullan (kod)

| Dosya / alan | Değişiklik |
|--------------|------------|
| `MailHtmlSanitize.ts` | Regex yerine DOMPurify (inbound); outbound policy aynı dosyada |
| `MailOutboundHtmlTemplate.ts` | `sanitizeOutboundHtml` → DOMPurify allowlist |
| `mail-web` okuma | `getMessageHtmlForRead` öncesi istemci sanitize (çift katman) |
| `sendWebPush.ts` | Zaten `web-push` — katalog + ayarlarda “bildirimler” notu |
| `MessagingRealtimeHubService.ts` | Zaten `ws` — katalog notu |
| Mesajlaşma web | İlk zengin HTML gövdesi varsa W3.2 ile aynı util paylaşımı (`core` veya `@lerta/html-sanitize`) |

### 3.4 Kabul kriterleri

- [ ] `oss:verify-catalog` geçer  
- [ ] Inbound `<script>` / `onerror=` fixture testi  
- [ ] Lisanslar ekranında 13±1 kayıt  
- [ ] `publish:main` deploy  

**Mobil:** FCM faz W6; web-push MPL metni web Legal’da kalır, mobilde FCM ayrı satır.

---

## W4 — Posta API (sunucu, kullanıcıya “platform” altında)

**Öncelik:** Giden posta ve sıkıştırma sunucu tarafı şeffaflığı.

### Yükle / göster

| ID | Paket | Lisans | Kullanım |
|----|-------|--------|----------|
| `nodemailer` | nodemailer | MIT-0 | SMTP / relay |
| `zstd-node` | `@mongodb-js/zstd` | Apache-2.0 | API zstd (istemci zstd ile eş) |
| (opsiyonel) `node-forge` | node-forge | GPL/BSD dual | S/MIME veya TLS yardımcı — **yalnızca gerçekten kullanılıyorsa** |

UI: Lisans detayında **“Sunucu bileşeni — tarayıcıya indirilmez”** i18n satırı.

### Kullan

- Zaten kullanılıyor; faz = **katalog + kullanım notu**, ekstra kod minimal.

### Kabul

- API SBOM script (yeni: `oss:sbom:api` veya mail-web BFS’e api posta deps ekle)  
- 15–16 katalog kaydı  

---

## W5 — Mesajlaşma web (`apps/web`)

### Yükle / göster

| ID | Paket | Kullanım |
|----|-------|----------|
| `leaflet` | leaflet | Harita (lojistik / konum mesajları) |
| (paylaşımlı) W1 | next, react | app.lerta.com.tr mesajlaşma |

### Kullan

- `apps/web` zaten Leaflet; **Lisanslar** için:
  - **A)** posta.lerta “Lisanslar”a Leaflet ekle + mesajlaşma ayarlarından link  
  - **B)** `app.lerta.com.tr` içinde aynı `OpenSourceLicenses` bileşenini mount (önerilen)

### SBOM

- `npm run oss:sbom:web` → `docs/oss/web-sbom.json` (yeni script, W5)

---

## W6 — Mobil uygulama v1 (Expo / React Native)

**Lisans sekmesine elle 127 satır eklenmez.**

| Adım | İş |
|------|-----|
| 1 | `apps/mobile` + lockfile |
| 2 | Android: `oss-licenses-plugin` / AboutLibraries |
| 3 | iOS: Settings.bundle veya OSS ekranı |
| 4 | `lerta-oss-registry.json` → `surface: mobile`, `phase: W6` |
| 5 | Script: `oss:merge-legal` → web registry + mobile SBOM → `legal-notices.json` |

**Gmail listesinden mobil faz:**

| Gmail / ekosistem | RN / native |
|-------------------|-------------|
| AppAuth | expo-auth-session |
| Firebase | expo-notifications (FCM/APNs token) ✓ |
| okhttp3 | Android stack |
| libPhoneNumber | libphonenumber (native) veya js |
| protobuf / gRPC | yalnızca seçilirse |
| React Native, Hermes | otomatik |

**Web W1–W5** mobil WebView açarsa aynı URL Legal; native ekran ayrı.

---

## W7 ✓ — Medya önizleme (posta ekleri)

| Gmail | Lerta |
|-------|--------|
| libjpeg-turbo | `sharp` (libvips) — API `GET …/attachments/:index/preview`, mail-web küçük JPEG thumb |
| giflib, freetype, harfbuzz | Sonraki faz / mobil native viewer |
| bzip2 | Opsiyonel arşiv export |

Katalog: `sharp` (sunucu; Legal’de kullanım notu).

---

## W8 ✓ — Görüntülü görüşme (disclosure + hazırlık)

| Gmail | Lerta |
|-------|--------|
| WebRTC / libSRTP | `browser-webrtc` Legal kaydı; mesajlaşma hub uyumluluk şeridi + `messaging/status` `webrtc` |
| libvpx, libwebm, dav1d, libaom | Mobil native stack → `planned` registry; web'de dağıtılmaz |

Web: tarayıcı `RTCPeerConnection` / `getUserMedia` (`@nakliyeborsasi/core` capability helper).  
Mobil: native WebRTC stack → otomatik OSS listesi (sonraki ürün fazı).

---

## Registry ve faz senkronu

`docs/oss/lerta-oss-registry.json` alanları:

- `phase`: `W0` … `W8`  
- `surfaces`: `mail-web` | `api` | `web` | `mobile`  
- `catalogId`: Lisanslar ekranı kimliği (null = SBOM-only)  
- `gmailRef`: Gmail 127 satır adı  
- `status`: `done` | `planned` | `skip`  

`GMAIL_OSS_LIST_CLASSIFIED.md` içindeki “W3” satırları bu dosyayla güncellenir.

---

## Sizin “yükle + göster + kullan” kontrol listesi (her faz)

1. Branch `cursor/oss-w*-8521`  
2. `npm install` (gerekli workspace’ler)  
3. `mailOpenSourceLicensesCatalogW*.ts` + i18n `ossLicense*Usage`  
4. `OSS_CATALOG_REQUIRED_PACKAGE_NAMES` + `verify-oss-catalog.mjs` expected ids  
5. Ürün kodu (yukarıdaki tablo)  
6. Test + build  
7. `npm run publish:main`  

---

## Önerilen sıra (iş yükü)

1. **W3** — En yüksek güvenlik / mesajlaşma değeri (DOMPurify + web-push + ws katalog)  
2. **W4** — Düşük efor (katalog only, kod zaten var)  
3. **W5** — Mesajlaşma web Legal + web SBOM  
4. **W6** — Mobil başlangıç + merge script  
5. W7–W8 — ürün roadmap’e bağlı  

Son güncelleme: W2 canlı (`c37073b`); sıradaki uygulama fazı **W3**.
