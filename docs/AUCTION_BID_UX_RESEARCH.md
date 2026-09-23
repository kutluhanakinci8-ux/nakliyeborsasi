# İhale / teklif verme — global rakip analizi ve NB yol haritası

**Tarih:** 2026-09-23  
**Bağlam:** Nakliye Borsası’nda teklif verme şu an `window.prompt` ile tek alan; Faz B şartname/ödeme tamamlandı. Bu belge **rakip UX + iş kuralları** ve **NB için fazlı ürün/teknik plan** içerir.

---

## 1. Pazar modelleri (üç ana aile)

| Model | Kim kullanıyor | Taşıyıcı ne yapar | Kazanan nasıl seçilir |
|--------|----------------|-------------------|------------------------|
| **A. Fiyat önerisi / müzakere** | [Trans.eu](https://www.trans.eu/api/freights-section/price-offer-negotiation/), [TIMOCOM](https://www.timocom.co.uk/help-center/frachten-laderaumboerse) | “Preisvorschlag / Submit quote” ile **bireysel fiyat** gönderir; mesajla pazarlık | Yük veren karşılaştırır, kabul/red/karşı teklif; sonra Deal veya bağlayıcı **Transport Order** |
| **B. Ters ihale (reverse auction)** | [Lardi-Trans tender](https://lardi-trans.com/en/tenders/), [LogiBrisk](https://www.logibrisk.com/products/smart-auction-management-system), spot RFQ araçları | **Düşen fiyat** ile rekabet; **min. adım (bid step)**; sıklıkla **en düşük** kazanır | Süre bitince en düşük uygun teklif; Lardi’de 3 gün içinde onay veya sıradaki en düşük |
| **C. Sabit fiyat / anında al** | Lardi `FIXED_PRICE`, Trans “accept displayed price” | Gösterilen fiyatı **hemen kabul** | İlk kabul veya yük veren onayı |

**TR · UA · EU · RU · KZ koridoru için pratik:** Borsa yüzünde hem **spot teklif** (TIMOCOM/Trans) hem **açık ters ihale** (Lardi, Doğu Avrupa) görülür. NB’nin “İhale” modülü **B**’ye yakın olmalı; marketplace satırındaki “Mesaj” **A**’yı tamamlar.

---

## 2. Rakip detayları — teklif ekranında ne var?

### Trans.eu

- Taşıyıcı, yük için **fiyat önerisi** başlatır; yük tarafı **kabul / red / karşı fiyat** ([API negotiate](https://www.trans.eu/api/freights-section/price-offer-negotiation/)).
- Borsa (exchange) yüklerinde müzakere API kısıtlı; platform UI’da tam akış.
- İhale/otomatik yayın kuralları: gruplara sırayla teklif, süre dolunca borsaya düşme ([TfS kuralları](https://www.trans.eu/en/blog/tfs/automatic-selection-of-carriers-how-do-tfs-publication-rules-work/)).
- **Kayıt:** Teklif/müzakere platformda **dokümante**; mesaj + dosya.

### TIMOCOM

- İlan detayında sağ altta **“Submit quote” / “Preisvorschlag abgeben”** — tutar + gönder; e-posta/telefon şart değil ([yardım](https://www.timocom.co.uk/help-center/frachten-laderaumboerse)).
- Yük veren **tüm teklifleri tablo**da görür; taşıyıcı kendi şirket tekliflerini görür.
- Koşul netleştirme **Messenger** (çeviri); anlaşma → **Deal** (hızlı) veya **Transport Order** (hukuken bağlayıcı).
- Fiyat TIMOCOM tarafından sabitlenmez; **barometre/API** referans ([haber 2025](https://www.timocom.co.uk/company/newsroom/new-way-of-assigning-freight-transport-logistic-2025-783390)).

### Lardi-Trans (tender — NB ihaleye en yakın)

- Tender tipleri: **`BIDS`** (piyasa / düşüş) vs **`FIXED_PRICE`** ([API create tender](http://api.lardi-trans.com/v2/docs/en/my-tenders/create-tender.html)).
- Zorunlu iş alanları: `paymentValue`, **`paymentBidStep`**, `paymentVat`, `paymentFormId`, `tenderStart`/`tenderEnd`, rota, araç, yük.
- Taşıyıcı: **min/max teklif sayısı**, rakip seviyesini görerek **daha düşük** teklif ([tender sayfası](https://lardi-trans.com/en/tenders/)).
- Bitiş: **en düşük fiyat** potansiyel kazanan; yük veren **3 gün** içinde onaylar veya sıradaki en düşüğe geçer ([winner selection](https://help.lardi-trans.com/en/freight/how_is_the_winner_picked.html)).

### Kurumsal RFQ / e-auction (referans UX)

- **Canlı sıra (L1, L2, …)**, teklif revizyonu, **anonim rakip fiyatı** (sadece en iyi seviye), süre uzatma, katılımcı hatırlatma ([LogiBrisk](https://www.logibrisk.com/products/smart-auction-management-system), [ProcureKey](https://www.procurekey.com/solutions/logistics-sourcing-software/)).
- Kazanan bazen **en düşük değil**: güven skoru, OTD, araç uyumu (weighted award).

---

## 3. Global “iyi teklif ver” UX kalıpları

Ortak bileşenler (modal / yan panel, `prompt` değil):

1. **Bağlam özeti** — rota, yükleme, araç, ağırlık, bitiş süresi (geri sayım).
2. **Fiyat kuralları** — para birimi, **KDV dahil/hariç**, taban / tavan, **min. adım**, bir sonraki geçerli teklif (ör. “Şu an en iyi: X → sizin min: X − step”).
3. **Tek tık artırımlar** — `−step`, `−2×step`, manuel alan; hata öncesi client doğrulama.
4. **Onay adımı** — “X EUR KDV hariç, ödeme 14 gün havale” özet + Gönder.
5. **Sonrası** — listede sıranız, teklif geçmişi, (ileride) **geri çek / revize** süresi.
6. **Güven** — firma adı, skor, belge durumu (Trans/TIMOCOM/Lardi hepsi güven/rating vurgular).
7. **İletişim** — tekliften bağımsız Messenger (A modeli); ihalede genelde teklif kanalı ayrı tutulur.

---

## 4. Nakliye Borsası — mevcut durum (2026-09-23)

| Alan | Durum |
|------|--------|
| UI | `AuctionsPageClient` + `AuctionDetailPageClient` → `window.prompt("Teklif tutarı")` |
| API | `POST .../bids` — sadece `bidAmount`; `minimumBidAmount` alt sınır |
| Faz B alanları | `bidStepAmount`, KDV, ödeme — **detayda gösteriliyor**, teklif API’sinde **kullanılmıyor** |
| Kazanan | `AuctionSessionFinalizationService` → `ORDER BY bidAmount DESC` (**en yüksek** kazanır) |
| Liste UI | “En yüksek” teklif gösterimi — **ters ihale mantığıyla çelişir** |

**Ürün kararı gerekli:** Yük veren ihalede endüstri standardı **ters ihale (en düşük uygun teklif)**. Mevcut DESC + “taban teklif” metni Lardi/spot RFQ ile uyumsuz; düzeltme **Faz C**’nin ilk backend işi olmalı.

---

## 5. Önerilen NB modeli (global ölçek)

**Varsayılan ihale tipi:** `REVERSE_OPEN` (Lardi `BIDS` benzeri)

- Taşıyıcı **düşen** fiyat verir; `bidAmount <= currentBest` (veya ilk teklifte `<= paymentValue`/taban).
- `bidStepAmount`: yeni teklif ≤ `currentBest - step` (veya eşitlik kuralları net tanımlanır).
- Bitiş: en **düşük** teklif `winningBidId`; yük veren **N gün** içinde onaylar (Lardi 3 gün — yapılandırılabilir).
- **İkincil mod** (sonra): `FIXED_ACCEPT` — ilan fiyatını kabul et (Lardi fixed / Trans accept).

**Teklif verme UI (Faz C1 — hızlı kazanım):**

- Paylaşımlı bileşen: `AuctionPlaceBidDialog`
- Props: session + listing özet + `termsAndPayment`
- Alanlar: tutar, KDV hatırlatması, ödeme özeti, geçerli aralık metni, Gönder/Vazgeç
- Liste + detayda aynı dialog; `prompt` kaldırılır

**Faz C2 — iş kuralları (API):**

- `bidStepAmount` zorunlu doğrulama
- Reverse auction sıralama + finalize `ASC`
- Aynı firmadan **son teklifi güncelle** (revize) vs yeni satır — rakiplerde çoğunlukla **revize**
- İsteğe bağlı: süre bitimine X dk kala **auto-extend** (LogiBrisk/ProcureKey)

**Faz C3 — rekabet görünürlüğü:**

- Taşıyıcıya: **mevcut en iyi fiyat** (anonim), teklif sayısı, kendi son teklifi
- Yük verene: tüm teklifler + güven skoru + L1/L2
- WebSocket veya kısa polling

**Faz C4 — TIMOCOM/Trans hibrit:**

- İlanda “**Sabit teklif ver**” (müzakere) vs “**İhaleye katıl**” ayrımı
- Messenger ile karşı teklif (A modeli) — ihale kapalı kaldığı sürece

---

## 6. Kabul kriterleri (Faz C — uygulandı, 2026-09-23)

- [x] Teklif verme tarayıcı `prompt` kullanmıyor (`AuctionPlaceBidDialog`)
- [x] Dialog şartname/ödeme/KDV/adım + onay
- [x] API: ters ihale, `bidStep`, firma revizesi, finalize ASC
- [x] L1/L2 leaderboard, `/live` polling, süre uzatma
- [x] Marketplace: sabit kabul + Messenger fiyat önerisi

---

## 7. Kaynaklar

- Trans.eu — [Price offer negotiation API](https://www.trans.eu/api/freights-section/price-offer-negotiation/)
- TIMOCOM — [Freight exchange help](https://www.timocom.co.uk/help-center/frachten-laderaumboerse)
- Lardi-Trans — [Tenders](https://lardi-trans.com/en/tenders/), [Create tender API](http://api.lardi-trans.com/v2/docs/en/my-tenders/create-tender.html), [Winner selection](https://help.lardi-trans.com/en/freight/how_is_the_winner_picked.html)
- LogiBrisk — [Smart auction management](https://www.logibrisk.com/products/smart-auction-management-system)
