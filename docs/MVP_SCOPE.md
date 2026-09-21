# Nakliye Borsası — MVP Kapsamı (Kilitli)

## Stratejik kararlar

| Alan | Karar |
|------|--------|
| Birincil pazar | Türkiye **ve** Ukrayna–AB koridoru (ikisi birden, eşit öncelik) |
| Gelir modeli | **Modüler abonelik** (Lardi tarzı segment + modül bazlı) + **katmanlı SaaS limitleri** (DAT tarzı arama/analitik kademeleri) |
| Diller (MVP) | `tr`, `en`, `uk`, `ru` |
| Harici veri | Lardi-Trans, Della, DAT, Truckstop, sennder, Freightos — normalize edilmiş tek API yüzeyi (adapter katmanı) |

## MVP modülleri (Faz 1)

### 1. Kimlik ve tenant
- Şirket kaydı (taşıyıcı, yük sahibi, forwarder)
- Rol tabanlı erişim (RBAC iskeleti)

### 2. Marketplace (çekirdek)
- Yük ve boş araç ilanı CRUD
- Gelişmiş arama (rota, kasa, tonaj, tarih, ödeme tipi)
- Kayıtlı arama tanımı (persist; bildirim Faz 1.1)

### 3. Modüler abonelik
- Modüller: `MARKETPLACE_SEARCH`, `CONTACTS`, `AUCTION`, `FLEET`, `LANE_ANALYTICS`, `EXTERNAL_FEEDS`, `API_ACCESS`
- Plan paketleri + kullanıcıya atanmış modül seti
- DAT benzeri kademe: arama sekmesi sayısı, lane analytics derinliği

### 4. Harici entegrasyon (read-only MVP)
- Provider adapter’ları; ortak `NormalizedFreightOffer` modeli
- Orchestrator: paralel fetch, timeout, hata izolasyonu
- Yapılandırılabilir API anahtarları (env)

### 5. Yerelleştirme
- `Accept-Language` / `?lang=` ile mesaj ve API hata gövdeleri
- Statik katalog + genişletilebilir JSON

### 6. API
- REST `/api/v1`
- OpenAPI (Faz 1.1)

## Faz 2 (MVP sonrası, mimariye hazır)
- İhale, mesajlaşma, güven skoru, canlı takip, mobil BFF, ödeme/faktoring partner hook’ları

## Teknik ilkeler (kod)
- Satır içi yorum yok
- Dosya başına tek sınıf
- İngilizce isimlendirme
- Ortak tipler ve exception’lar `core/`
- Hexagonal: domain ← application ← infrastructure
