# Microsoft Graph takvim köprüsü

Office 365 / Outlook takvimi webmail ile **iki yön** senkron (Microsoft Graph `Calendars.ReadWrite`).

## Ortam

Aynı Azure uygulaması Exchange posta senkronu ile paylaşılabilir:

- `MICROSOFT_GRAPH_MAIL_CLIENT_ID` / `MICROSOFT_GRAPH_MAIL_CLIENT_SECRET`
- `MICROSOFT_GRAPH_CALENDAR_REDIRECT_URI` → `https://<posta-host>/mail/calendar-oauth`  
  (yoksa `MICROSOFT_GRAPH_MAIL_REDIRECT_URI` içindeki `exchange-oauth` → `calendar-oauth` türetilir)

İsteğe bağlı ayrı uygulama: `MICROSOFT_GRAPH_CALENDAR_CLIENT_ID` / `SECRET`.

Azure portalında redirect URI ve **Calendars.ReadWrite** delegated izni ekleyin.

## API

- `GET company/mail-inbox/calendar/graph/accounts`
- `GET company/mail-inbox/calendar/graph/oauth/start`
- `POST company/mail-inbox/calendar/graph/oauth/complete`
- `DELETE company/mail-inbox/calendar/graph/accounts/:id`
- `POST company/mail-inbox/calendar/graph/accounts/:id/sync`
- `POST company/mail-inbox/calendar/graph/accounts/sync-all`

## Webmail

Takvim → **Microsoft Graph takvim** → Outlook / Microsoft 365 bağla.

SQL: `scripts/sql/mail-calendar-graph-account.sql`

Zamanlayıcı: 30 dk (`MailCalendarGraphSyncScheduler`).
