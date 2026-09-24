# Faz B pilot — `@kullanici.lerta.tr`

Organizasyonlar **paylaşımlı alt alan** üzerinden transactional `From` alır:  
`{slug}@kullanici.lerta.tr` (ör. `acme-lojistik@kullanici.lerta.tr`).

Platform bildirimleri (Faz A) değişmez: `notifications@mail.lerta.tr`.

## 1. Tek seferlik DNS (isimtescil — IP Bazlı DNS)

| Tür | Host | Değer |
|-----|------|--------|
| TXT | `kullanici.lerta.tr` | `v=spf1 ip4:168.231.109.27 -all` |
| TXT | `default._domainkey.kullanici.lerta.tr` | VPS `setup-opendkim-kullanici-lerta-tr.sh` çıktısı |
| TXT | `_dmarc.lerta.tr` | (Faz A ile aynı DMARC yeterli) |

VPS:

```bash
bash scripts/setup-opendkim-kullanici-lerta-tr.sh
# MAIL_PLATFORM_TENANT_DKIM_TXT=.env içine public key
```

## 2. Admin ürün akışı

1. **Bildirimler → Kurumsal kimlik (B)** → **DNS doğrula** (`kullanici.lerta.tr`).
2. Pilot organizasyon seç → **local-part** (slug) → **Provision**.
3. **Operasyon → Test mail** — isteğe `organizationId` ile Faz B From testi.

## 3. Gönderim mantığı

- Outbox `metadata.companyId` → `MailSenderResolutionService` → doğrulanmış varsayılan sender identity.
- Domain doğrulanmamış veya kimlik yoksa → Faz A `notifications@mail.lerta.tr`.

## 4. Organizasyon self-service (B2)

1. Firma sahibi: **Hesap → Organizasyon → E-posta kimliği**
2. Platform DNS hazır ve domain `verified` ise local-part seç → **Kurumsal gönderen oluştur**
3. API: `GET/POST/PATCH /api/v1/company/mail-identity`

Arka plan: `MailTenantDnsVerificationScheduler` (~30 dk) paylaşımlı alan DNS’ini senkronlar.

## 5. B3 — Rate limit ve ihale testi

- Kurumsal `From` kullanılan gönderimler: `MAIL_ORG_MAX_SENDS_PER_HOUR` (varsayılan 200/saat/org).
- Admin **Operasyon**: olay `AUCTION_BID_PLACED` + organizasyon UUID + test alıcı → outbox `metadata.companyId` ile tenant From.
- API: `GET /api/v1/platform-admin/notifications/org-send-rate?organizationId=...`

## 6. B4 — İtibar (tamamlandı)

Detay: [EMAIL_FAZ_B_B4_REPUTATION.md](./EMAIL_FAZ_B_B4_REPUTATION.md)

## 7. Sonraki adımlar (B5+)

- Özel domain `@musteri.com`
- Gönderim audit / KVKK log
