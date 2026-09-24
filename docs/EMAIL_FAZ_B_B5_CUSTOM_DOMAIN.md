# Faz B5 — Özel domain (`@musteri.com`)

Organizasyonlar kendi alan adından transactional **From** kullanabilir (ör. `bildirim@musteri.com`). Paylaşımlı `kullanici.lerta.tr` ile aynı outbox çözümlemesi geçerli; varsayılan sender özel domain doğrulandığında ona geçer.

## Akış (firma sahibi)

1. **Hesap → Organizasyon → E-posta kimliği** → **Özel domain kaydet** (`musteri.com`).
2. Panelde gösterilen **SPF**, **DKIM** ve önerilen **DMARC** TXT kayıtlarını müşteri DNS’ine ekleyin.
3. **DNS doğrula** — public resolver ile SPF + DKIM TXT kontrol edilir.
4. **Gönderen oluştur** (local-part, örn. `bildirim`).
5. Admin **Operasyon → Test mail** ile `organizationId` + olay testi.

API:

- `GET/POST /api/v1/company/mail-identity/custom-domain`
- `POST .../custom-domain/verify-dns`
- `POST .../custom-domain/provision`

## VPS / OpenDKIM

DKIM private key API kaydında tutulur (`dnsSnapshot`). Doğrulama sonrası:

| Yöntem | Ne yapar |
|--------|----------|
| `MAIL_SYNC_OPENDKIM=true` | API host’ta `/etc/opendkim` KeyTable + SigningTable + restart |
| Manuel | `bash scripts/register-opendkim-custom-domain.sh musteri.com` |

SPF müşteri DNS’inde VPS IP içermeli (`MAIL_PLATFORM_SPF_IPV4` ile panelde gösterilen değer).

## Admin

**Bildirimler → Kurumsal kimlik (B)**:

- Özel domain ekleme (org UUID + domain) → `MailCustomDomainService` (DKIM üretimi).
- Kayıtlı domainler tablosunda **custom** satırlar için **DNS doğrula** (`POST .../mail/domains/:id/verify-dns`).

## Kısıtlar

- `*.lerta.tr` ve `kullanici.lerta.tr` özel domain olarak eklenemez.
- Organizasyon için tek **custom** domain (değiştirmek destek ile).
- Tam posta kutusu (gelen mail) Faz C; Reply-To platform hattı (B4).

## İlgili dosyalar

- `MailCustomDomainService.ts`, `MailCustomDomainOpenDkimInstaller.ts`
- `scripts/register-opendkim-custom-domain.sh`
- UI: `OrganizationMailIdentityPanel.tsx`, `AdminMailDomainsPanel.tsx`
