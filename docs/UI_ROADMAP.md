# Önyüz (UI/UX) — ne zaman, ne yapılacak?

## Neden şu an “ham” görünüyor?

Bilerek **önce işlev, sonra görünüm** gittik:

1. API + auth + modüller (Lardi/DAT tarzı ürünün omurgası)
2. VPS’te çalışan **panel** (tek HTML — hızlı demo)
3. **Web’e aynı modüller** taşındı (ihale, mesaj, güven) — henüz **tek uzun sayfa**, sekmesiz

Yani ekran görüntünüzdeki yapı **bilinçli MVP iskeleti**; “unutulmuş tasarım” değil, sıradaki faz.

Referans rakipler (Lardi, Della, DAT): önce veri/akış, sonra yoğun UI — biz de aynı sırayı izliyoruz.

---

## Faz 3.2 — Web tasarım & sayfa yapısı (sıradaki önyüz işi)

**Ne zaman:** Fonksiyon eşitliği bitti (panel ≈ web). **Bundan sonraki mantıklı adım bu** — mobil ve domain’den **önce** yapılması önerilir (mobil aynı tasarım dilini kopyalar).

| Deliverable | Açıklama |
|-------------|----------|
| **App shell** | Üst bar: logo, dil, firma, çıkış; yan veya alt **navigasyon** (Marketplace, İhale, Mesajlar, Güven, Entegrasyonlar) |
| **Sayfa ayrımı** | Tek scroll yerine route veya sekmeler (`/marketplace`, `/auctions`, …) — her modül kendi ekranı |
| **Tasarım sistemi** | Renk, tipografi, spacing token’ları; kart/liste/table bileşenleri; boş/hata/yükleniyor durumları |
| **Marketplace UX** | Filtre çubuğu, ilan kartları (rota, fiyat, CTA), mobil uyum |
| **Form UX** | Mesaj/güven formları modal veya yan panel; JSON `<pre>` yerine okunabilir liste |
| **i18n UI** | tr/en/uk/ru metinler arayüzde (API zaten destekliyor) |
| **Panel** | İsteğe bağlı: statik panel kaldırılır veya web’e yönlendirme |

**Tahmini kapsam (teknik):** `apps/web` layout + 5–6 sayfa + ortak bileşenler; `globals.css` → modüler CSS veya Tailwind (projede convention’a göre).

---

## Sonrası

| Sıra | Faz | Önyüzle ilişki |
|------|-----|----------------|
| 1 | **3.2 Web UI** | Asıl ürün görünümü |
| 2 | 3.3 Mobil | Expo + aynı API; shell mobil |
| 3 | 6 nginx/SSL | Tek domain, güven rozeti |
| 4 | 7 Filo / analytics | Yeni ekranlar tasarım sistemine eklenir |

---

## Sizin karar noktası

- **“Önce güzel web”** → bir sonraki geliştirme sprint’i **Faz 3.2** (mobil ve nginx ertelenir).
- **“Önce mobil / domain”** → UI 3.2 biraz gecikir; yine de mobilden önce web shell yapmak daha verimli.

Varsayılan öneri: **şimdi Faz 3.2’ye geçelim** (nav + sayfalar + marketplace kartları); ardından Expo.
