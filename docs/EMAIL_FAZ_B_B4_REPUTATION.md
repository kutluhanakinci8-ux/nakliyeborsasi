# Faz B4 — İtibar ayrımı (org suppression, Reply-To, footer)

## Org suppression

- **Platform** (`email_suppressions`): tüm gönderimlerde geçerli.
- **Organizasyon** (`email_organization_suppressions`): yalnızca `metadata.companyId` ile giden (kurumsal From) maillerde geçerli.
- Otomatik bounce (`hard` / `spam`): kurumsal gönderimde **org listesine**; platform gönderiminde **global** listeye.

API:

| Rol | Endpoint |
|-----|----------|
| Platform admin | `GET/POST/DELETE /platform-admin/notifications/suppressions` (+ `organizationId` query) |
| Firma sahibi | `GET/POST/DELETE /company/mail-identity/suppressions` |

## Reply-To ve güven footer

Kurumsal `From` kullanıldığında:

- **Reply-To:** `MAIL_PLATFORM_REPLY_TO` veya `admin@lerta.tr`
- HTML alt bilgi: firma adına Lerta üzerinden gönderim açıklaması

## Rate limit (B3)

`MAIL_ORG_MAX_SENDS_PER_HOUR` (varsayılan 200) — kurumsal From başına.
