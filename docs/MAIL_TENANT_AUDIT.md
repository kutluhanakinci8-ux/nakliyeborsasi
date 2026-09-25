# Lerta Mail — Tenant denetim kaydı (E4)

## API

`GET /company/mail-identity/audit?limit=50&before=<ISO8601>`

- Yetki: tüm Lerta Mail konsol rolleri (`assertMailConsoleAccess`)
- Kaynak: `audit_logs` — `action_code` `MAIL_%` ve (`actor_company_id` = tenant veya `metadata.organizationId` = tenant)

Yanıt alanları: `labelTr`, `summaryTr`, `actorEmail`, `metadata`, `createdAt`.

## Kaydedilen olaylar

| Kod | Açıklama |
|-----|----------|
| `MAIL_IDENTITY_*` | Domain, gönderen, DNS, suppression, görünen ad |
| `MAIL_IDENTITY_DEFAULT_SENDER_SET` | Varsayılan gönderen |
| `MAIL_SUBSCRIPTION_PLAN_SELECTED` | Plan seçimi |
| `MAIL_TEAM_*` | Davet, rol, üye çıkarma |
| `MAIL_PRIVACY_*` | KVKK export / silme |
| `MAIL_TENANT_SUSPENDED` / `UNSUSPENDED` | Operatör askı (metadata.organizationId) |

## Konsol

`/audit` — sayfalanmış tablo, “Daha eski kayıtlar” ile `before` cursor.

Platform operatörü global liste: `GET /platform-admin/mail/identity-audit` (mevcut).
