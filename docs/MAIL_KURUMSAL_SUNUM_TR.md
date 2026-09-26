# Lerta Posta — kurumsal müşteri sunumu (Türkiye)

**Kullanım:** Satış, teklif ekleri, demo öncesi özet. Tek sayfa okuma süresi ~5 dk.  
**Teknik detay:** [MAIL_WEBMAIL_UX_BENCHMARK.md](./MAIL_WEBMAIL_UX_BENCHMARK.md) · [MAIL_PROJECT_COMPLETION_STATUS.md](./MAIL_PROJECT_COMPLETION_STATUS.md)

---

## Özet (yönetici)

Lerta Posta, **Türkiye’de özel alan adı** (`info@sizinmarka.com.tr`) ile kurumsal e-posta sunan **yerli SaaS** paketidir: webmail, yönetim konsolu, DNS sihirbazı, teslimat şeffaflığı ve KVKK self-servis tek ekosistemde.

Global rakipler (Google Workspace, Microsoft 365) **ölçek ve AI** tarafında öndedir; Lerta ise **TR uyumluluk, yerel ödeme, şeffaf DNS/teslimat ve KOBİ odaklı fiyatlandırma** ile konumlanır.

| Gösterge | Lerta | Gmail WS / M365 (referans) |
|----------|-------|----------------------------|
| **Webmail + günlük kullanım (ağırlıklı skor)** | **~74 / 100** | **~89–90 / 100** |
| **Lerta’nın rakip webmail’e göre tamamlanma oranı** | — | **~82–83%** |
| **Kurumsal TR paket (posta + yönetim + KVKK + yerel ödeme) — kod** | **~94%** | Global paket **~100%** |
| **Satılabilir lansman (canlı ödeme + www marka)** | **~78%** *(anahtar/DNS sizde)* | **~100%** |

---

## Neden Lerta? — Türkiye kurumsal avantajları

| Avantaj | Ne sunuyoruz? | Rakipte tipik durum |
|---------|----------------|---------------------|
| **Veri ve operasyon TR odaklı** | VPS + MTA modeli; tenant teslimat paneli, bounce → suppression | Global bölge seçimi; teslimat detayı sınırlı |
| **KVKK self-servis** | Konsolda veri export + hesap silme akışı (E3) | Var; süreç genelde global politika |
| **Yerel ödeme** | Stripe + **iyzico**, TRY plan kataloğu (A7) | TRY/iyzico entegrasyonu zayıf veya ayrı kanal |
| **Özel domain uçtan uca** | Kayıt → DNS sihirbazı → pilot kutu → webmail | Var; çoğu zaman çok adımlı veya bayi |
| **Şeffaf e-posta altyapısı** | SPF/DKIM/DMARC runbook, DMARC aggregate görünümü, rotasyon scriptleri | Var; KOBİ’ye görünür panel daha az |
| **Tek marka ekosistem** | `yonetim` (konsol) + `posta` (webmail) + `kurumsal` (vitrin) | Ürünler parçalı (Admin, Outlook, web) |
| **KOBİ operasyon** | Operatör tenant listesi, gönderim kotası, abuse askıya alma (B7) | Enterprise lisans; küçük işletmede pahalı |
| **Harici istemci** | IMAP/SMTP, Thunderbird rehberi, CalDAV/CardDAV | Var (Lerta: çakışma çözüm UI henüz yok) |

**Satış cümlesi:** *“Kurumsal kutunuz Türkiye odaklı, özel domain’iniz ve KVKK süreçleriniz aynı panelde; global ofis paketinin karmaşıklığı olmadan.”*

---

## Hizmet karşılaştırması — kurumsal paket (% tamamlanma)

**Referans:** Gmail Workspace / Microsoft 365 kurumsal paketi = **%100** (olgunluk).  
**Lerta:** aynı hizmeti ne kadar karşılıyoruz (ürün + TR katmanı).

### A. Posta kutusu ve günlük kullanım

| Hizmet | Lerta | Rakip (Gmail/M365) | Lerta başarı |
|--------|-------|--------------------|--------------|
| Webmail (gelen, gönderilen, spam, taslak) | ✓ | ✓ | **~95%** |
| Konuşma (thread) görünümü | ✓ | ✓ | **~90%** |
| Arşiv / çöp, gelişmiş arama | ✓ | ✓ | **~92%** |
| Ek, depolama kotası, imza/şablon | ✓ | ✓ | **~90%** |
| Snooze, geri al (undo send), kısayollar | ✓ | ✓ | **~90%** |
| Yıldız, özel klasör, gelen kuralları | ✓ (gelişmiş MVP) | ✓ (çok derin) | **~75%** |
| Zengin metin yazım | HTML / kısmi RTE | Tam WYSIWYG | **~70%** |
| AI özet / akıllı yanıt | — | ✓ | **~0%** |

**Blok ortalaması (günlük posta):** Lerta **~85%** (Gmail/M365’e göre).

### B. Güvenlik ve uyumluluk (kurumsal satın alma soruları)

| Hizmet | Lerta | Rakip | Lerta başarı |
|--------|-------|-------|--------------|
| HTTPS / TLS (webmail) | ✓ + doğrulama scripti | ✓ | **~90%** |
| TOTP (2FA) webmail + konsol | ✓ | ✓ | **~95%** |
| KVKK export / silme self-servis | ✓ | ✓ (global süreç) | **~95%** |
| Tenant denetim kaydı (audit) | ✓ | ✓ (Enterprise) | **~90%** |
| DMARC aggregate görünümü | ✓ | Kısmi / üçüncü parti | **~95%** *(niş güçlü)* |
| Yedekleme / DR runbook | ✓ | ✓ (ölçekli) | **~85%** |

**Blok ortalaması (güven & uyumluluk):** Lerta **~92%** — **TR KOBİ satışında öne çıkarılacak blok.**

### C. Kurumsal yönetim (ekip, domain, kota)

| Hizmet | Lerta | Rakip | Lerta başarı |
|--------|-------|-------|--------------|
| Çoklu posta kutusu (plan kotası) | ✓ | ✓ | **~95%** |
| Davet + roller (mail_admin, billing…) | ✓ | ✓ | **~95%** |
| Alias / paylaşımlı adres | ✓ | ✓ | **~90%** |
| Gönderim kotası + upgrade yolu | ✓ | ✓ | **~90%** |
| Abonelik yaşam döngüsü (iptal/grace) | ✓ (kod) | ✓ | **~90%** *(canlı ödeme sonrası %100’a yakın)* |
| White-label logo / kurumsal kimlik | ✓ (Enterprise) | ✓ | **~85%** |

**Blok ortalaması (kurumsal yönetim):** Lerta **~91%**.

### D. Entegrasyon ve verimlilik

| Hizmet | Lerta | Rakip | Lerta başarı |
|--------|-------|-------|--------------|
| IMAP / SMTP (Outlook, Thunderbird) | ✓ | ✓ | **~90%** |
| Org takvim + kişiler (web) | ✓ | ✓ | **~88%** |
| CalDAV / CardDAV / ICS feed | ✓ | ✓ | **~82%** |
| Web push + offline (PWA) | ✓ (iOS PWA kısıtı) | ✓ + native app | **~75%** |
| Native iOS/Android uygulama | — | ✓ | **~0%** |
| Teams / Drive / Office ekosistemi | — | ✓ (M365) | **~0%** *(bilinçli fark)* |

**Blok ortalaması (entegrasyon):** Lerta **~72%** — *mobil mağaza ve Office ekosistemi beklenmemeli.*

### E. Ticari ve marka (Türkiye lansman)

| Hizmet | Lerta | Rakip | Lerta başarı |
|--------|-------|-------|--------------|
| Kurumsal vitrin + kayıt | ✓ | ✓ | **~95%** |
| Stripe + **iyzico** (TRY) | Kod hazır | Zayıf TR | **~120%** *(canlı key ile)* |
| `www` tek marka cutover | Script hazır | — | **~40%** *(DNS/iş adımı)* |
| Durum sayfası / public status | ✓ | ✓ | **~90%** |

---

## Boyut skoru — sunum slaytı (0–100)

| Boyut | Lerta | Gmail | M365 Outlook | **Lerta / Gmail** |
|-------|-------|-------|--------------|-------------------|
| Güven & TLS | 88 | 98 | 98 | **90%** |
| Temel kutu | 78 | 95 | 94 | **82%** |
| Üretkenlik | 78 | 92 | 90 | **85%** |
| Konuşma & iletme | 82 | 95 | 93 | **86%** |
| Yazma (RTE) | 72 | 90 | 88 | **80%** |
| Mobil / PWA | 72 | 85 | 82 | **85%** |
| Kurumsal marka & alias | 65 | 70 | 75 | **93%** |
| IMAP & takvim | 74 | 90 | 92 | **82%** |
| Akıllı (AI, gelişmiş filtre) | 35 | 80 | 75 | **44%** |
| **Ağırlıklı toplam** | **~74** | **~90** | **~89** | **~82%** |

---

## Kim için uygun?

| Profil | Öneri |
|--------|--------|
| **10–100 kişi, `firma.com.tr` kutusu, KVKK soruları** | **Güçlü uyum** — paket ve panel TR odaklı |
| **Tam Office + Teams + SharePoint** | **M365** tercih; Lerta posta odaklı |
| **AI özet, Gemini/Copilot entegrasyonu** | **Gmail/M365**; Lerta henüz yok |
| **Sadece IMAP + mobil mağaza uygulaması şart** | Rakip native app; Lerta PWA + IMAP |
| **Yerel kart ile abonelik, sade fiyat** | **Lerta + iyzico** (canlıya alındığında) |

---

## Dürüst sınırlar (güven için)

- Global **AI** ve **native mobil uygulama** yok.
- Yazım deneyimi **tam Gmail WYSIWYG** değil.
- CalDAV **çakışma çözüm ekranı** yok.
- **Canlı ödeme** ve **www** marka birliği iş/DNS adımlarınızı bekliyor (`run-lansman-preflight.sh`).

---

## Demo ve doğrulama linkleri

| Kaynak | URL / komut |
|--------|-------------|
| Webmail | `https://posta.lerta.com.tr/mail` |
| Yönetim konsolu | `https://yonetim.lerta.com.tr` |
| Kurumsal vitrin | `https://kurumsal.lerta.com.tr` |
| HTTPS kontrol | `bash scripts/verify-posta-https.sh` |
| Lansman ön kontrol | `bash scripts/run-lansman-preflight.sh` |

---

## Ek: rakip tipi kısa konum

| Rakip tipi | Lerta’nın göreli konumu |
|------------|-------------------------|
| **Google Workspace** | Webmail **~82%**; TR paket/ödeme **~94%** kod |
| **Microsoft 365** | Webmail **~83%**; Office ekosistemi **bilinçli eksik** |
| **Zoho Mail** | Webmail **~87%**; benzer KOBİ segmenti |
| **Yerel hosting e-posta** | Lerta **üstün** (webmail UX, kurallar, takvim, konsol) |

*Son güncelleme: 2026-09-26 — ürün durumu ile senkron tutulmalı.*
