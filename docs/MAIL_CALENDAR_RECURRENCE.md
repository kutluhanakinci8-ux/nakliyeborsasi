# Tekrarlayan takvim etkinlikleri (D6)

Org takviminde **günlük / haftalık / aylık** tekrar; liste görünümünde aralık içinde genişletilir.

## Webmail

Takvim → yeni etkinlik → **Tekrar** seçimi; isteğe bağlı **bitiş tarihi**.

- **Bu tekrarı sil** — `DELETE calendar/events/:id?occurrenceStartsAt=` ile istisna (o örnek listeden düşer). `occurrenceStartsAt` için listedeki `occurrenceAnchorAt` kullanın (override sonrası da sabit).
- **Bu tekrarı düzenle** — `PATCH calendar/events/:id/occurrence` ile başlık/tarih override (`mail_calendar_recurrence_exception` override kolonları).
- **Tüm seriyi sil** — ana etkinlik ve istisnalar kaldırılır.
- Ay ızgarasında çok günlü etkinlikler hafta satırında sürekli şerit (`mail-cal-event-bar`) + gün vurgusu.

## API

`POST/PATCH calendar/events` alanları:

- `recurrenceFrequency`: `daily` | `weekly` | `monthly` (yok = tekrar yok)
- `recurrenceUntil`: ISO (isteğe bağlı)

`GET calendar/events` yanıtı:

- `recurrenceRule`, `recurrenceUntil`, `isRecurrenceOccurrence`, `isOccurrenceOverride`, `occurrenceAnchorAt`
- Tekrarlı etkinlikler `from`–`to` aralığında çoğaltılır.

`PATCH calendar/events/:id/occurrence` gövdesi:

- `occurrenceStartsAt` (zorunlu) — `occurrenceAnchorAt`
- `title`, `startsAt`, `endsAt`, `allDay` (isteğe bağlı override)

## iCal

- İçe/dışa aktarma `RRULE` (FREQ=DAILY|WEEKLY|MONTHLY).
- CalDAV **PUT** tekrar kuralını içerir.
- Tekrar örneği override: `POST .../calendar/caldav/accounts/:accountId/push/:eventId/occurrence` — `{ "occurrenceStartsAt" }` ile `RECURRENCE-ID` içeren ayrı `.ics` (webmail: **CalDAV’a yaz (bu tekrar)**).

## VPS şema

```bash
bash scripts/apply-mail-d6-recurrence-schema.sh /var/www/nakliyeborsasi
bash scripts/apply-mail-d6-recurrence-exception-schema.sh /var/www/nakliyeborsasi
bash scripts/apply-mail-d6-occurrence-override-schema.sh /var/www/nakliyeborsasi
```
