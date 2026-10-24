# Paylaşımlı kutu / delegasyon ve Exchange senkronu

## Delegasyon (Gmail delegate paritesi)

- **Kurum geneli (`organization`)**: Mevcut davranış — Mail konsoluna erişen roller gelen kutuyu görür.
- **Paylaşımlı / delegasyon (`delegates_only`)**: Yalnızca kutu sahibi, atanmış delegeler ve MailAdmin/Owner görür.
- **Delegasyon izinleri**: `read` (okuma), `send` (okuma + gönder), `manage` (delegasyon yönetimi).

API:

- `GET company/mail-inbox/mailbox-delegations`
- `PATCH company/mail-inbox/mailboxes/:id/access-mode`
- `POST company/mail-inbox/mailboxes/:id/delegates`
- `DELETE company/mail-inbox/mailboxes/:id/delegates/:delegateId`

Webmail: **Ayarlar → Hesaplar** — «Paylaşımlı kutu ve delegasyon».

SQL: `scripts/sql/mail-mailbox-delegate-exchange.sql`

## Microsoft Exchange senkronu

Microsoft Graph **delta** ile Office 365 gelen kutusu webmail’e aktarılır (30 dk cron + manuel «Senkronize et»).

Ortam:

- `MICROSOFT_GRAPH_MAIL_CLIENT_ID`
- `MICROSOFT_GRAPH_MAIL_CLIENT_SECRET`
- `MICROSOFT_GRAPH_MAIL_REDIRECT_URI` → `https://<posta-host>/mail/exchange-oauth`

API:

- `GET company/mail-inbox/exchange/oauth/start`
- `POST company/mail-inbox/exchange/oauth/complete`
- `GET|DELETE company/mail-inbox/exchange/accounts`
- `POST company/mail-inbox/exchange/accounts/:id/sync`
- `POST company/mail-inbox/exchange/accounts/sync-all`

Harici istemci (Outlook masaüstü) için mevcut **IMAP/JMAP** yolu değişmez; Graph senkronu webmail içi birleşik kutu sağlar.
