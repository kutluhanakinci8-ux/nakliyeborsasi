# LTR — Ekosistem master planı (PDF yerine geçecek seviye)

**Sürüm:** 1.0 · **Tarih:** 2026-10 (Europe/Istanbul)  
**Kapsam:** Google Play, Apple App Store, masaüstü, web, Lerta Posta/Mesaj gömülü kullanım, dış mesajlaşma kanalları.

**İlgili:** [LTR_24_MONTH_ROADMAP.md](./LTR_24_MONTH_ROADMAP.md) · [LTR_SPEC_V1_DRAFT.md](./LTR_SPEC_V1_DRAFT.md) · [LTR_MODULE_LAYOUT.md](./LTR_MODULE_LAYOUT.md)

---

## 1. Ürün ailesi (indirilebilir + gömülü)

| Ürün | Kim indirir? | Mağaza / kanal | Rol |
|------|--------------|----------------|-----|
| **LTR Viewer** | Herkes (hesapsız okuma) | Google Play, App Store, Windows/macOS (F5+), PWA | `.ltr` aç, yazdır, PDF’e aktar, paylaş |
| **LTR Author** | Belge üreten kullanıcılar | Aynı mağazalar + web (F4) | Şablon, düzenle, sealed/linked export |
| **LTR (Lerta Logistics içi modül)** | Mevcut Lerta mobil | `com.lerta.logistics` güncellemesi | Mesaj eklerini native viewer’da aç; paylaşım menüsü |
| **LTR SDK** | Lerta Posta/Mesaj web | npm `@lerta/ltr-sdk` (F2) | Gömülü önizleme, compose, upload |
| **LTR Sunucu** | Sadece Lerta ops | `apps/api/modules/ltr` (F4) | Linked belge, OTP, watermark, analitik |

**Mağaza stratejisi:** TR pazarında önce **ayrı “Lerta LTR” viewer** (hızlı onay, düşük friction) + ana Lerta uygulamasında **Share Extension / dosya ilişkilendirme** (F5). Author ikinci mağaza listesi (F4).

---

## 2. PDF’yi operasyonda değiştirmek için özellik seti (hedef)

| PDF yeteneği | LTR karşılığı | Faz |
|--------------|---------------|-----|
| Tek dosya, e-posta eki | Mühürlü `.ltr` | F0–F1 ✅ |
| Herkes açar | Viewer mağaza + tarayıcı mühür | F1, F5 |
| Yazdır / arşiv | Print + **PDF export** | F1 |
| Form doldurma | `form` blok + gönder (linked) | F4 |
| İmza / onay | `approval` blok + e-imza hook | F5–F6 |
| Erişilebilirlik | Semantic HTML + manifest | F1 |
| Arama | Manifest indeks | F2 |
| Güvenli paylaşım | Linked + OTP, watermark | F4 |
| Offline | Sealed mühür | F0 |
| Canlı güncelleme | Linked mod | F4 |
| Çok dil | `lang` + UI locale | F6 |
| Etkileşim (tablo/grafik) | Blok renderer | F1+ |

Resmi **e-Fatura / UBL / mahkeme arşivi** PDF/XML kalır — LTR iddiası **operasyonel belge** sınırında.

---

## 3. Entegrasyon matrisi (nerede açılır?)

| Sistem | Nasıl? | Viewer |
|--------|--------|--------|
| **Lerta Mesaj** (web/mobil) | Ek `contentType` + `kind: ltr` | Gömülü SDK / native WebView |
| **Lerta Posta** | IMAP + webmail ek | Gömülü iframe viewer |
| **WhatsApp / Telegram** | Link + OG; dosya → indir → Viewer | Mağaza uygulaması veya tarayıcı |
| **iOS / Android dosyalar** | UTType / intent `VIEW` `.ltr` | LTR Viewer veya Lerta modül |
| **Windows / macOS** | Dosya ilişkilendirme | LTR Viewer desktop |
| **Tarayıcı** | Sürükle-bırak `/ltr/viewer` | Web viewer |
| **3. parti mail (Outlook mobil)** | Generic ek | Kullanıcı “LTR ile aç” |
| **Partner API** | `GET /ltr/v1/documents/{id}` | Token + SDK |

---

## 4. Teknik mimari

```text
                    ┌─────────────────────────────────────┐
                    │     @nakliyeborsasi/core / ltr      │
                    │  validate · extract · renderBlocks  │
                    └──────────────┬──────────────────────┘
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
   apps/ltr-viewer-web     apps/mobile (modül)      apps/api/ltr
   (PWA + /ltr/viewer)     Share + WebView          hosted + auth
           │                       │
           ▼                       ▼
   Google Play (TWA/PWA)    App Store (RN + WebView)
   + standalone APK/AAB     + Document types
```

**Derleme kuralı:** Tek renderer mantığı `core`; mağaza uygulamaları ve web aynı paketi bundle eder (versiyon kilidi).

**Deep link:** `lerta://ltr/open?url=…` · `https://www.lerta.com.tr/ltr/viewer?src=…`

---

## 5. Mağaza yol haritası (24 ay içinde)

| Ay | Google Play | App Store |
|----|-------------|-----------|
| F1 (3–6) | Kapalı test: **LTR Viewer** internal APK | TestFlight: salt okunur viewer |
| F3 (11–14) | Lerta Logistics güncellemesi: mesaj LTR eki | Aynı |
| F4 (15–18) | **LTR Author** beta kanalı | TestFlight Author |
| F5 (19–21) | **LTR Viewer** halka açık TR | App Store “Lerta LTR” |
| F6 (22–24) | Global listing (EN) | Global listing |

**Store gereksinimleri (erken hazırlık):** gizlilik politikası LTR için, KVKK metni, offline veri toplama yok (sealed), linked mod için ayrı açıklama.

---

## 6. Fazlar — ekosistem teslimleri (özet)

| Faz | Ekosistem teslimi |
|-----|-------------------|
| **F0** | Spec, core, `/indirmeler`, örnek `.ltr` |
| **F1** | Web viewer, `renderBlocks`, print/PDF; Play internal test build |
| **F2** | Posta SDK gömme; MIME; arama |
| **F3** | Mesaj kart + viewer; mobil WebView modülü v0 |
| **F4** | Author; linked sunucu; OTP |
| **F5** | Mağaza yayını Viewer+Author; OS dosya ilişkilendirme; WA deep link |
| **F6** | Global store; view portal; MIME/IANA taslağı |

---

## 7. Başarı metrikleri (ekosistem)

- Mağaza: **≥ 4.0** puan, crash-free **≥ 99.5%**
- Dış açılım (Viewer veya tarayıcı): **≥ 85%** (M24)
- Mesaj/posta eklerinde LTR: **≥ 45%** TR (M21)
- Play + App Store indirme (Viewer kümülatif): **≥ 25.000** (M24 global)

---

## 8. Güvenlik

- Sealed: statik analiz, max boyut, CSP sandbox WebView
- Linked: JWT token, süre, kiracı izolasyonu, rate limit
- Mağaza: her sürüm SBOM (`npm run oss:sbom:mobile` genişletmesi F5)

---

## 9. Hemen sonraki kod adımları (F1 başlangıç)

1. `core/src/ltr/ltrRenderBlocksHtml.ts` — tek renderer
2. `apps/web/src/app/ltr/viewer` — dosya yükle + örnek aç
3. `apps/mobile` — document type stub + viewer placeholder
4. `docs` + `/indirmeler` — mağaza planı görünür

Posta/Mesaj API değişikliği **F2**’ye kadar bekler.
