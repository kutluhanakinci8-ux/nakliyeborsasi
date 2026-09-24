# Lerta Logistics — platform markası

## Görünen ad

- **Ürün adı:** Lerta Logistics (`PLATFORM_PRODUCT_NAME`)
- **Büyük harf (e-posta üst bilgi):** LERTA LOGISTICS
- **Monogram:** LL

Kaynak: `core/src/constants/PlatformBranding.ts` — API ve web aynı sabitleri kullanır.

## Birincil e-posta

- **lertalogistics@gmail.com** — operasyon, admin bildirimleri (`PLATFORM_ADMIN_EMAILS`), iletişim formları, SMTP varsayılan gönderen.

Platform operatör konsolu (`/admin`) **yalnızca** `lertalogistics@gmail.com` ile açılır (`isPlatformOperatorEmail`).

## Platform sahibi (bootstrap)

API açılışında `ensurePlatformOwnerAccount` hesabı oluşturur:

- E-posta: `lertalogistics@gmail.com`
- Firma: Lerta Logistics (yük veren / TR)
- İlk şifre: `core` içindeki `PLATFORM_OWNER_BOOTSTRAP_PASSWORD` (varsayılan `822159Ka`); girişten sonra değiştirin.
- Henüz giriş yapılmamışsa seed bootstrap şifresini yeniden uygular; `PLATFORM_OWNER_FORCE_BOOTSTRAP_PASSWORD=true` ile zorlanabilir.

## Ortam değişkenleri

```env
PLATFORM_ADMIN_EMAILS=lertalogistics@gmail.com
SMTP_FROM=Lerta Logistics <lertalogistics@gmail.com>
```

VPS’te `.env` güncellenmeli; kod varsayılanları artık Gmail’i işaret eder.

## Monorepo paket adı

npm workspace adı `@nakliyeborsasi/*` geçmiş uyumluluk için değiştirilmedi; kullanıcıya dönük metinlerde **Lerta Logistics** kullanılır.
