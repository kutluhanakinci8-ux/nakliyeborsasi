# WinLRT — Ürün yol haritası (öncelik #1)

**Konum:** WinRAR benzeri **indirilebilir istemci ailesi** — ama format **`.ltr` (Lerta Document)**; RAR/WinZip **yok**.  
**Sıra:** Önce **WinLRT** (Windows → macOS → Android → iOS) mağaza/indirme; **sonra** Lerta Posta/Mesaj entegrasyonu.

**Format motoru:** `@nakliyeborsasi/core/ltr` (tek kaynak).  
**İlgili:** [LTR_SPEC_V1_DRAFT.md](./LTR_SPEC_V1_DRAFT.md) · [LTR_SELF_HOSTED_DEPENDENCY_INVENTORY.md](./LTR_SELF_HOSTED_DEPENDENCY_INVENTORY.md)

---

## 1. WinLRT nedir?

| WinRAR | WinLRT |
|--------|--------|
| `.rar` arşiv | **`.ltr` mühürlü belge** (teklif, rapor, paket) |
| Sıkıştırma odaklı | **Okuma + oluşturma + dışa aktarma** odaklı |
| Ücretli lisans | **Ücretsiz okuyucu** + isteğe bağlı Pro (Author, şablon) |
| Windows ağırlıklı | **Windows, macOS, Android, iOS** aynı çekirdek |

**v1 WinLRT işlevleri**

1. `.ltr` **aç** (çift tık, sürükle-bırak)  
2. **Görüntüle** (interaktif tablo/grafik)  
3. **Yazdır / PDF’e aktar**  
4. **Yeni .ltr oluştur** (basit şablon + bloklar) — v1.1  
5. **Dosya ilişkilendirme** (OS “WinLRT ile aç”)  
6. **Offline** — mühürlü dosya, ağ zorunlu değil  

**v1 dışı (sonra):** linked URL, OTP, Lerta hesabı sync, Posta/Mesaj köprüsü.

---

## 2. Platform ürünleri (tek marka, dört indirme)

| Platform | Paket adı | Dağıtım | Dosya ilişkisi |
|----------|-----------|---------|----------------|
| **Windows** | WinLRT | `.msi` / MS Store (opsiyonel) | `.ltr` varsayılan |
| **macOS** | WinLRT | `.dmg` / Mac App Store (opsiyonel) | UTType `com.lerta.document.ltr` |
| **Android** | WinLRT | Google Play | `VIEW` intent |
| **iOS** | WinLRT | App Store | Dosyalar / Share Extension |

**Bundle ID (öneri):** `com.lerta.winlrt` (Lerta Logistics’ten **ayrı** uygulama — mağaza onayı hızlı).

**Web:** `lerta.com.tr/indirmeler` — indirme linkleri + sürüm notları (WinLRT web viewer geçici köprü kalır).

---

## 3. Teknik mimari (kendi yolumuz)

```text
@nakliyeborsasi/core/ltr     validate · extract · renderDocument
         │
         ├── apps/winlrt/desktop/   Tauri 2 + React UI (Win + Mac)
         ├── apps/winlrt/mobile/    Expo (Android + iOS)
         └── apps/web/ltr/viewer    Geçici; WinLRT yayına kadar
```

| Katman | Seçim | Gerekçe |
|--------|--------|---------|
| UI | React 18 | Web viewer ile paylaşım |
| Masaüstü kabuk | **Tauri 2** | Electron’a göre hafif; kendi build |
| Mobil | **Expo** | RN; ayrı `apps/winlrt/mobile` |
| Sıkıştırma | Mühürlü HTML veya ZIP DEFLATE | WinRAR yok |
| PDF | Sistem yazdır / WebView print | Adobe yok |

---

## 4. Faz planı (WinLRT önce — ~12 ay istemci)

Her faz sonu: **PR → main merge → deploy** (indirmeler sayfası + sürüm artefaktı).

### W0 — Hazırlık (2–3 hafta) ✅ kısmen

| Teslim | Durum |
|--------|--------|
| `.ltr` spec + core renderer | ✅ |
| `/indirmeler`, örnek dosya | ✅ |
| `apps/winlrt/` repo iskeleti | Bu sprint |
| WinLRT marka / ikon brief | Tasarım |

**Çıkış:** Geliştirici Windows build altyapısı dokümante.

---

### W1 — WinLRT Windows (6–8 hafta)

| Teslim | Detay |
|--------|--------|
| Tauri + paylaşılan viewer UI | Dosya aç, önizleme, yazdır |
| `.ltr` dosya ilişkilendirme | Kurulum sırasında |
| Imzalı installer | Authenticode (test: self-sign) |
| `indirmeler` | WinLRT Windows beta indir |

**KPI:** 50 beta kullanıcı, crash-free ≥ %99.

**Merge/deploy #1**

---

### W2 — WinLRT macOS (4–6 hafta)

| Teslim | Detay |
|--------|--------|
| Tauri macOS build | Aynı UI |
| DMG + notarization | Apple Developer |
| UTType kayıtlı | `.ltr` |

**Merge/deploy #2**

---

### W3 — WinLRT Android (5–6 hafta)

| Teslim | Detay |
|--------|--------|
| Expo app `com.lerta.winlrt` | WebView + core bundle |
| Play **internal testing** → açık test | TR |
| Intent: aç / paylaş | WhatsApp’tan indirilen `.ltr` |

**Merge/deploy #3** (store track ayrı; site APK yok — Play link)

---

### W4 — WinLRT iOS (5–6 hafta)

| Teslim | Detay |
|--------|--------|
| TestFlight | Salt okuma + PDF export |
| App Store TR | WinLRT listesi |
| Share Extension v0 | Dosyalar → WinLRT |

**Merge/deploy #4**

---

### W5 — WinLRT olgunlaştırma (4 hafta)

| Teslim | Detay |
|--------|--------|
| Basit **belge oluştur** (Author v1) | Tüm platformlarda |
| 3 lojistik şablon | Teklif, kapasite, rota |
| TR vitrin + sürüm otomatik | `indirmeler` |

**Merge/deploy #5**

---

### W6+ — Lerta platform (eski LTR F2…)

WinLRT kullanıcı tabanı varken:

- Posta / Mesaj LTR eki  
- Linked mod sunucusu  
- Lerta Logistics içi modül (WinLRT SDK embed)

Detay: [LTR_24_MONTH_ROADMAP.md](./LTR_24_MONTH_ROADMAP.md) (platform fazları **W5 sonrası** kaydırıldı).

---

## 5. Zaman çizelgesi (özet)

```text
2026 Q4   W0 iskelet + W1 Windows başlangıç
2027 Q1   W1 Windows beta · W2 macOS
2027 Q2   W3 Android · W4 iOS
2027 Q3   W5 Author v1 · TR mağaza tam
2027 Q4+  Lerta Posta/Mesaj LTR entegrasyonu
```

---

## 6. İndirmeler sayfası (hedef durum)

| Satır | Platform | W fazı |
|-------|----------|--------|
| WinLRT for Windows | `.msi` | W1 |
| WinLRT for Mac | `.dmg` | W2 |
| WinLRT on Google Play | Badge link | W3 |
| WinLRT on App Store | Badge link | W4 |
| Örnek `.ltr` | Dosya | W0 ✅ |
| Web viewer | Köprü | W0 ✅ → W1’de “WinLRT indir” CTA |

---

## 7. Başarı kriterleri (WinLRT aşaması)

| Metrik | W1 | W5 |
|--------|-----|-----|
| Toplam indirme (4 platform) | 200 | 10.000 |
| `.ltr` dış açılım (WinLRT ile) | %60 | %85 |
| Mağaza puanı | — | ≥ 4.2 |

---

## 8. Sonraki kod adımı (W0 tamamlama)

1. `apps/winlrt/desktop` — Tauri iskelet + core import  
2. `apps/winlrt/mobile` — Expo iskelet `com.lerta.winlrt`  
3. CI: Windows artefakt build (merge #1 hazırlığı)  
4. `/indirmeler` — WinLRT yol haritası tablosu  

Platform entegrasyonu **W1 Windows beta merge’den sonra** sırayla.
