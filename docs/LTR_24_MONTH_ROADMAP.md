# LTR — 24 aylık yol haritası (Türkiye → global)

**Başlangıç:** 2026-10 (Europe/Istanbul)  
**Bitiş hedefi:** 2028-10  
**Ürün:** Lerta Document (`.ltr`) — operasyonel belgede PDF alternatifi; resmi/e-Fatura ekosisteminde PDF export yan yolu.

**İlgili:** [LTR_SPEC_V1_DRAFT.md](./LTR_SPEC_V1_DRAFT.md) · `@nakliyeborsasi/core` → `ltr/*`

---

## 1. Stratejik hedefler (24 ay)

| KPI | TR (M12) | TR (M24) | Global (M24) |
|-----|----------|----------|--------------|
| Lerta Posta/Mesaj giden eklerde LTR payı | ≥ %15 | ≥ %45 | ≥ %25 (TR dışı tenant) |
| Dış alıcı ilk açılım (hesapsız) | ≥ %70 | ≥ %85 | ≥ %75 |
| Mühürlü `.ltr` tarayıcıda açılma (QA) | 3 tarayıcı | + mobil Safari/Chrome | + Edge global |
| İndirilen Viewer/Author (kümülatif) | 500 | 5.000 | 15.000 |
| Lojistik şablon kütüphanesi | 3 | 12 | 20 (+ EN) |

**Bilinçli kapsam dışı (24 ay):** e-Fatura UBL yerine geçmek; WhatsApp içinde native render; DocSend seviyesi ısı haritası (M24 sonrası).

---

## 2. Faz özeti

```text
M0–2   F0  İskelet + spec + vitrin İndirmeler
M3–6   F1  TR: mühürlü format + web viewer + örnekler
M7–10  F2  TR: Lerta Posta (ek, önizleme, PDF export)
M11–14 F3  TR: Lerta Mesaj + lojistik şablonlar + OG link
M15–18 F4  TR: Author beta, linked mod, güvenlik katmanı
M19–21 F5  TR: mobil viewer, WA deep link, KOBİ yayılım
M22–24 F6  Global: locale, view portal, MIME/IANA yolu, EU bölgesi
```

---

## 3. Faz 0 — İskelet (Ay 0–2)

**Amaç:** Diğer sunucu programlarına dokunmadan format ve vitrin.

| Teslim | Detay |
|--------|--------|
| Spec taslağı | `LTR_SPEC_V1_DRAFT.md`, JSON Schema `apps/web/public/ltr/spec/ltr-1.0.schema.json` |
| Core paket | `core/src/ltr/*` — sabitler, manifest tipleri, doğrulama |
| Örnek dosya | `public/ltr/samples/ornek-teklif.ltr` (mühürlü HTML) |
| Vitrin | `https://www.lerta.com.tr/indirmeler` — Viewer yol haritası, spec linkleri |
| Repo yapısı | `docs/LTR_*`, `core/src/ltr`, ileride `apps/ltr-viewer-web` (F1) |

**Çıkış kapısı:** Örnek `.ltr` çift tık → tarayıcıda okunur; manifest unit test PASS.

---

## 4. Faz 1 — TR mühürlü format + web viewer (Ay 3–6)

**Amaç:** PDF gibi tek dosya; kurulum opsiyonel.

| Teslim | Detay |
|--------|--------|
| LTR Viewer (web) | Salt okunur; baskı / PDF’e aktar (print-to-PDF) |
| Blok renderer v1 | markdown, callout, table, kpis, chart (SVG) |
| MIME | `application/vnd.lerta.document+html` (iç kullanım) |
| İndirmeler | Viewer PWA veya statik paket indirme stub → gerçek build F1 sonu |
| QA | TR locale, A11y temel, 5 MB mühürlü üst sınır |

**Çıkış kapısı:** 10 pilot firma (iç) yalnızca Viewer + manuel `.ltr` ile teklif okur.

---

## 5. Faz 2 — Lerta Posta TR (Ay 7–10)

**Amaç:** Posta kanalında LTR birincil operasyonel ek.

| Teslim | Detay |
|--------|--------|
| API | Allow-list MIME; inbound/outbound `.ltr` |
| Webmail | Okuma paneli gömülü viewer; manifest metin indeksi (arama v1) |
| Compose | “LTR ekle”, şablondan yeni (F3 ile paylaşılan şablon motoru) |
| Güvenlik | Mevcut virüs/kota; S/MIME ile sealed ek uyumu |
| Export | Giden iletide “PDF kopyası ekle” opsiyonu |

**Çıkış kapısı:** Posta giden eklerin ≥ %15’i LTR (pilot kiracılar).

---

## 6. Faz 3 — Lerta Mesaj TR + şablonlar (Ay 11–14)

**Amaç:** Thread içi interaktif belge; lojistik dili.

| Teslim | Detay |
|--------|--------|
| Mesaj ekleri | `application/vnd.lerta.document+html` + kind `ltr` meta |
| UI | Kart önizleme + tam ekran viewer |
| Şablonlar | Teklif, kapasite özeti, rota özeti (TR) |
| Paylaşım | Linked mod v0: `lerta.com.tr/l/{token}` + OG kart |
| Köprü | WhatsApp bildirim metninde deep link |

**Çıkış kapısı:** Mesaj eklerinin ≥ %20’si LTR; 3 şablon production.

---

## 7. Faz 4 — Author + linked güvenlik TR (Ay 15–18)

**Amaç:** Bağımsız oluşturma; hassas teklif.

| Teslim | Detay |
|--------|--------|
| LTR Author | Web veya electron beta; yerel `.ltr` kaydet |
| Linked mod | OTP, allow-list, süreli link, watermark |
| Denetim | Okuma olayı (kiracı politikası, KVKK metni) |
| Hosted storage | İzole modül / bucket; mevcut posta DB’sine minimal dokunuş |

**Çıkış kapısı:** Author ile üretilen dosyaların ≥ %30’u Lerta dışına e-posta ile gider ve açılır.

---

## 8. Faz 5 — TR ölçek (Ay 19–21)

**Amaç:** Türkiye B2B’de format tanınırlığı.

| Teslim | Detay |
|--------|--------|
| Mobil Viewer | iOS/Android “Paylaş → LTR ile aç” |
| Masaüstü Viewer | Win/macOS dosya ilişkilendirme |
| Pazarlama | Sektör webinarları, İndirmeler SEO |
| Entegrasyon | İhale thread’inden “Teklif LTR gönder” |
| Metrik panosu | Kiracı başına LTR/adoption |

**Çıkış kapısı:** TR Lerta müşterilerinde giden operasyonel eklerin ≥ %45’i LTR.

---

## 9. Faz 6 — Global (Ay 22–24)

**Amaç:** TR’de kanıtlanmış modeli ihracat.

| Teslim | Detay |
|--------|--------|
| i18n | Manifest `lang`, UI EN + TR; şablon EN seti |
| view.lerta.com.tr | Global sürükle-bırak okuma (opsiyonel hesap) |
| Bölge | EU barındırma değerlendirmesi (linked mod) |
| Standart | MIME kayıt taslağı, güvenlik beyanı (HTML sealed model) |
| Posta/Mesaj | TR dışı tenant flag; locale-aware OG |

**Çıkış kapısı:** ≥ 1 TR dışı pilot tenant; global indirme sayfası EN; spec v1 dondurulmuş.

---

## 10. Teknik iskelet (repo)

```text
docs/
  LTR_24_MONTH_ROADMAP.md      ← bu dosya
  LTR_SPEC_V1_DRAFT.md
core/src/ltr/
  ltrConstants.ts
  ltrManifestTypes.ts
  ltrManifestValidate.ts
  index.ts
apps/web/
  public/ltr/spec/ltr-1.0.schema.json
  public/ltr/samples/*.ltr
  src/app/indirmeler/
apps/ltr-viewer-web/           ← F1 (henüz yok)
apps/ltr-author-web/           ← F4 (henüz yok)
apps/api/src/modules/ltr/      ← F2+ (henüz yok; izole Nest modül)
```

**Bağımlılık kuralı:** F0–F1 yalnızca `core` + vitrin. F2+ posta/mesaj modülleri yalnızca `ltr` modül API’sine bağlanır.

---

## 11. Risk ve telafi

| Risk | Telafi |
|------|--------|
| Dış alıcı açmıyor | Mühürlü tarayıcı + view portal |
| Hukuk PDF ister | Her viewer’da PDF export |
| Scope | Faz başına tek “büyük” teslim; F1 bitmeden Posta yok |
| Global erken | F6’ya kadar yalnızca TR pazarlama |

---

## 12. İzleme (aylık)

- `ltr_documents_sent_total` (posta / mesaj / dış)
- `ltr_external_open_rate`
- `ltr_viewer_downloads`
- `ltr_template_usage`
- `ltr_linked_vs_sealed_ratio`

Log şeması F2’de `docs/LTR_OBSERVABILITY.md` ile tamamlanacak.
