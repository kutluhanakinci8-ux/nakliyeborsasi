# Lerta Logistics — platform markası

## Görünen ad

- **Ürün adı:** Lerta Logistics (`PLATFORM_PRODUCT_NAME`)
- **Büyük harf (e-posta üst bilgi):** LERTA LOGISTICS
- **Monogram:** LL

Kaynak: `core/src/constants/PlatformBranding.ts` — API ve web aynı sabitleri kullanır.

## Birincil e-posta

- **lertalogistics@gmail.com** — operasyon, admin bildirimleri (`PLATFORM_ADMIN_EMAILS`), iletişim formları, SMTP varsayılan gönderen.

Yerel geliştirmede test kullanıcıları `@test.nakliyeborsasi.local` ve seed `admin@nakliyeborsasi.local` kalır; platform operatör konsolu (`/admin`) bu adreslerle **ve** `lertalogistics@gmail.com` ile açılır (`isPlatformOperatorEmail`).

## Ortam değişkenleri

```env
PLATFORM_ADMIN_EMAILS=lertalogistics@gmail.com
SMTP_FROM=Lerta Logistics <lertalogistics@gmail.com>
```

VPS’te `.env` güncellenmeli; kod varsayılanları artık Gmail’i işaret eder.

## Monorepo paket adı

npm workspace adı `@nakliyeborsasi/*` geçmiş uyumluluk için değiştirilmedi; kullanıcıya dönük metinlerde **Lerta Logistics** kullanılır.
