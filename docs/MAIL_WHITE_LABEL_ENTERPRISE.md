# Lerta Mail — white-label (F4, Enterprise)

## Plan

| Plan kodu | Marka (logo, renk, dipnot) | Tam white-label (chrome gizle) |
|-----------|------------------------------|--------------------------------|
| `lerta_mail_pilot_tr` | Hayır | Hayır |
| `lerta_mail_corporate_tr` | Evet | Hayır |
| `lerta_mail_enterprise_tr` | Evet | Evet |

Operatör veya faturalama ile Enterprise plan atandıktan sonra tenant marka ayarları açılır.

Pilot test: `MAIL_WHITELABEL_EXTRA_PLAN_CODES=lerta_mail_corporate_tr` (virgülle birden fazla).

## API

| Metot | Yol | Açıklama |
|--------|-----|----------|
| GET | `company/mail-identity/branding` | `allowed`, logo, From adı, chrome bayrakları |
| PATCH | `company/mail-identity/branding` | Yetki: posta yöneticisi / firma sahibi |
| PATCH | `company/mail-inbox/branding` | Aynı alanlar — webmail Ayarlar → Hesaplar |

Alanlar:

- `logoUrl` — HTTPS ( `MAIL_WHITELABEL_ALLOW_HTTP=true` ile http test )
- `emailBrandTitle` — şablon üst bilgi adı
- `defaultFromDisplayName` — transactional From; varsayılan gönderen kutusuna da yazılır
- `hidePlatformEmailChrome` — Lerta üst/alt şablon + minimal güven dipnotu

## E-posta akışı

Tenant `companyId` ile outbox gönderiminde:

1. `MailSenderResolutionService` — Enterprise From görünen adı
2. `MailOrganizationBrandingService.applyToTransactionalHtml` — logo / başlık
3. `appendTenantTrustFooter` — `minimal` veya platform dipnotu

Webmail compose mevcut kutu `displayName` davranışını korur.

## Konsol

`/branding` — White-label formu (Enterprise değilse yükseltme linki).

Denetim: `MAIL_BRANDING_UPDATED`.

## Veritabanı

Tablo: `mail_organization_branding` (`TYPEORM_SYNCHRONIZE` veya migration).

Plan satırı: `scripts/sql/lerta-mail-subscription-plans.sql` → `lerta_mail_enterprise_tr`.

İlgili: [LERTA_MAIL_PRODUCT_ROADMAP.md](./LERTA_MAIL_PRODUCT_ROADMAP.md) F4.
