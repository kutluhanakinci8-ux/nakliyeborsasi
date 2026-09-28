# `@lerta.com.tr` — üyelik sonrası posta adresi

## Ürün akışı

1. **Yeni kurumsal üyelik** — giriş e-postası (mevcut kurumsal/kişisel adres) + şifre.
2. **Yönlendirme** — `/hesap/posta-adresi?welcome=1` (posta sihirbazı).
3. Kullanıcı **ön ek** seçer → `kutluhanlogistics@lerta.com.tr`.
4. **Sonra hatırlat** — organizasyon sayfasına gider; oturumda atlandı işareti.

## Teknik

| Bileşen | Açıklama |
|---------|----------|
| `core/mail/lertaComTrLocalPart.ts` | Unvandan slug, rezerv liste, validasyon |
| `GET .../onboarding/lerta-com-tr/suggest` | Öneri + müsaitlik |
| `GET .../onboarding/lerta-com-tr/availability` | Tek ön ek kontrolü |
| `POST .../onboarding/claim-address` | `localPart@lerta.com.tr` provision |
| `LertaComTrMailAddressPicker` | Web UI (sihirbaz + organizasyon) |

## Kapatılan kanallar (yeni claim)

- `@firma.post` / Lerta Post vanity
- Yeni claim yalnızca tenant domain (`MAIL_PLATFORM_TENANT_DOMAIN`, varsayılan `lerta.com.tr`)

Mevcut `instant_post` kutuları silinmez; yeni müşteri bu yolu kullanmaz.

## DNS (platform, bir kez)

`lerta.com.tr` MX → `mail.lerta.com.tr` — tüm `*@lerta.com.tr` kutuları için yeterli.
