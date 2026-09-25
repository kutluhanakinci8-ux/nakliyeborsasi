# Lerta Mail — KVKK veri export ve silme (E3)

## Kapsam

Firma sahibi (`CompanyOwner`) rolü:

- **Export:** `GET /company/mail-identity/privacy/export` — JSON indirme (DKIM private key redacted).
- **Silme durumu:** `GET /company/mail-identity/privacy/deletion-status`
- **Talep:** `POST /company/mail-identity/privacy/deletion-request` — body: `confirmPhrase` (`LERTA-MAIL-SIL`), opsiyonel `reason`
- **Onay:** `POST /company/mail-identity/privacy/deletion-request/confirm` — `requestId`, `confirmToken` (talep oluşturulduğunda bir kez döner)
- **İptal:** `DELETE /company/mail-identity/privacy/deletion-request/:requestId`

Konsol: `/privacy`

## Bekleme süresi

- `MAIL_KVKK_COOLING_HOURS` (varsayılan **24**, üst sınır 168)
- Test/staging: `MAIL_KVKK_IMMEDIATE_ERASE=true` — onayda bekleme kontrolü atlanır

## Silme sonrası

- Gelen/giden mesajlar, taslaklar, şablonlar, DMARC aggregate, IMAP creds, org suppressions, ekip davetleri silinir
- Domain `dnsSnapshot` scrub (DKIM PEM kaldırılır)
- Mail kutuları `suspended`
- Operatör state: `suspended` + gönderim kapalı notu

Denetim: `MAIL_PRIVACY_*` aksiyon kodları (`MailIdentityAuditService`).

## Veritabanı

Tablo: `mail_organization_deletion_request` — `TYPEORM_SYNCHRONIZE=true` veya migration ile oluşturulmalı.
