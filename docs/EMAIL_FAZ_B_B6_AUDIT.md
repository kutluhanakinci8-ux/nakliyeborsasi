# Faz B6 — Gönderen kimliği denetimi (KVKK)

Kurumsal e-posta kimliği işlemleri `audit_logs` tablosuna `MAIL_IDENTITY_*` action kodlarıyla yazılır.

## Kayıt altına alınan işlemler

| Action | Tetikleyen |
|--------|------------|
| `MAIL_IDENTITY_CUSTOM_DOMAIN_REGISTERED` | Firma sahibi özel domain kaydı |
| `MAIL_IDENTITY_CUSTOM_DOMAIN_DNS_VERIFIED` / `_FAILED` | DNS doğrulama |
| `MAIL_IDENTITY_SENDER_PROVISIONED` | Tenant veya özel domain gönderen |
| `MAIL_IDENTITY_DISPLAY_NAME_UPDATED` | Görünen ad |
| `MAIL_IDENTITY_SUPPRESSION_*` | Org suppression |
| `MAIL_IDENTITY_TENANT_SUBDOMAIN_*` | Admin pilot subdomain |
| `MAIL_IDENTITY_ADMIN_*` | Platform admin domain işlemleri |

Metadata’da `kvkkPurposeTr` alanı: sözleşme / meşru menfaat açıklaması.

## Görüntüleme

- Admin → **Bildirimler** → **Denetim (B6)**
- API: `GET /api/v1/platform-admin/mail/identity-audit`

## Kod

- `MailIdentityAuditService.ts`
- Controller’lar: `CompanyMailIdentityController`, `PlatformMailIdentityAdminController`
