# Google Calendar OAuth köprüsü

Google Takvim ile webmail **iki yön** senkron (Calendar API v3).

## Ortam

- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URI` → `https://<posta-host>/mail/google-calendar-oauth`  
  (yoksa `MAIL_WEB_PUBLIC_URL` + `/mail/google-calendar-oauth`)

Google Cloud Console: OAuth 2.0 istemci, **Calendar API** etkin, redirect URI ve scope  
`https://www.googleapis.com/auth/calendar`.

## API

- `GET company/mail-inbox/calendar/google/accounts`
- `GET company/mail-inbox/calendar/google/oauth/start`
- `POST company/mail-inbox/calendar/google/oauth/complete`
- `DELETE company/mail-inbox/calendar/google/accounts/:id`
- `POST company/mail-inbox/calendar/google/accounts/:id/sync`
- `POST company/mail-inbox/calendar/google/accounts/sync-all`

## Webmail

Takvim → **Google Takvim** → Google hesabı bağla.

SQL: `scripts/sql/mail-calendar-google-account.sql`

Zamanlayıcı: 30 dk (`MailCalendarGoogleSyncScheduler`).

Bkz. Microsoft karşılığı: `docs/MAIL_GRAPH_CALENDAR.md`
