# Test kullanıcıları (pazar rolleri)

Tüm hesaplar **aynı şifre**: `TestPass123!`

API başlangıcında (`DatabaseSeedRunner`) eksik e-postalar otomatik oluşturulur.

## Yük veren (5) — `LOAD_SHIPPER`

Her firmanın marketplace’te **1 demo ilanı** vardır.

| E-posta | Firma |
|---------|--------|
| `yukveren01@test.nakliyeborsasi.local` | Anadolu Gıda Lojistik |
| `yukveren02@test.nakliyeborsasi.local` | Ege Tekstil İhracat |
| `yukveren03@test.nakliyeborsasi.local` | Marmara Otomotiv Yan Sanayi |
| `yukveren04@test.nakliyeborsasi.local` | Karadeniz Orman Ürünleri |
| `yukveren05@test.nakliyeborsasi.local` | İç Anadolu Tarım Kooperatifi |

Plan: `carrier_professional_tr_ua`

## Yük taşıyan (5) — `LOAD_CARRIER`

| E-posta | Firma |
|---------|--------|
| `yuktasiyan01@test.nakliyeborsasi.local` | Atlas Taşımacılık A.Ş. |
| `yuktasiyan02@test.nakliyeborsasi.local` | Doğu Avrupa Filo |
| `yuktasiyan03@test.nakliyeborsasi.local` | Koridor Express |
| `yuktasiyan04@test.nakliyeborsasi.local` | Bosphorus Logistics |
| `yuktasiyan05@test.nakliyeborsasi.local` | Steppe Cargo UA |

Plan: `carrier_professional_tr_ua`

## Yük arayan (5) — `LOAD_SEEKER`

Dispetcher rolü, arama odaklı **starter** plan.

| E-posta | Firma |
|---------|--------|
| `yukarayan01@test.nakliyeborsasi.local` | Merkez Dispetcher Ofis 1 |
| `yukarayan02@test.nakliyeborsasi.local` | Merkez Dispetcher Ofis 2 |
| `yukarayan03@test.nakliyeborsasi.local` | Merkez Dispetcher Ofis 3 |
| `yukarayan04@test.nakliyeborsasi.local` | Merkez Dispetcher Ofis 4 |
| `yukarayan05@test.nakliyeborsasi.local` | Merkez Dispetcher Ofis 5 |

Plan: `carrier_starter_tr_ua`

## Diğer demo hesaplar

| Rol | E-posta | Şifre |
|-----|---------|--------|
| Genel demo | `demo@nakliyeborsasi.local` | `DemoPass123!` |
| Partner demo | `partner@nakliyeborsasi.local` | `DemoPass123!` |
| Platform admin | `admin@nakliyeborsasi.local` | `AdminPass123!` |

Giriş: http://168.231.109.27:3011/login
