# Lerta Mail — yönetim konsolu destek talepleri

## UI

| Ortam | Adres |
|-------|--------|
| Konsol | `https://yonetim.lerta.com.tr/destek/talepler` |
| Giriş (next) | `/login?next=/destek/talepler` |

## API (JWT + mail konsol erişimi)

| Metot | Yol |
|-------|-----|
| GET | `/api/v1/company/mail-identity/support/tickets` |
| POST | `/api/v1/company/mail-identity/support/tickets` |
| GET | `/api/v1/company/mail-identity/support/tickets/:ticketId` |
| POST | `/api/v1/company/mail-identity/support/tickets/:ticketId/messages` |

Konu (`topic`): `technical` | `billing` | `sales` | `general`.

## Veritabanı

Tablolar (TypeORM):

- `mail_organization_support_ticket`
- `mail_organization_support_ticket_message`

Production’da `TYPEORM_SYNCHRONIZE=true` ile otomatik oluşur veya manuel DDL (uuid PK, timestamptz).

Denetim: `MAIL_SUPPORT_TICKET_CREATED`, `MAIL_SUPPORT_TICKET_CUSTOMER_REPLY`, `MAIL_SUPPORT_TICKET_STAFF_REPLY`, `MAIL_SUPPORT_TICKET_STATUS_UPDATED`.

## Operatör (platform admin)

| Metot | Yol |
|-------|-----|
| GET | `/api/v1/platform-admin/mail/support/tickets` |
| GET | `/api/v1/platform-admin/mail/support/tickets/:ticketId` |
| POST | `/api/v1/platform-admin/mail/support/tickets/:ticketId/messages` |
| PATCH | `/api/v1/platform-admin/mail/support/tickets/:ticketId/status` |

Konsol UI: `https://yonetim.lerta.com.tr/operator/destek` (platform operatör JWT).

## Yeni talep e-postası

Ortam: `MAIL_SUPPORT_NOTIFY_EMAIL` (virgülle ayrılmış; varsayılan `destek@lerta.com.tr`). Olay: `MAIL_SUPPORT_TICKET_OPENED` (outbox).

## İlgili

- Vitrin `/destek`, `apps/mail-marketing/src/lib/marketingSupportConsole.ts`
- SLA: `apps/mail-marketing/src/app/sla/page.tsx`
