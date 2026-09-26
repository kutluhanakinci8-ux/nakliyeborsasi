# Tekrarlayan takvim etkinlikleri (D6)

Org takviminde **günlük / haftalık / aylık** tekrar; liste görünümünde aralık içinde genişletilir.

## Webmail

Takvim → yeni etkinlik → **Tekrar** seçimi; isteğe bağlı **bitiş tarihi**.

- **Bu tekrarı sil** — `DELETE calendar/events/:id?occurrenceStartsAt=` ile istisna (o örnek listeden düşer). `occurrenceStartsAt` için listedeki `occurrenceAnchorAt` kullanın (override sonrası da sabit).
- **Bu tekrarı düzenle** — `PATCH calendar/events/:id/occurrence` ile başlık/tarih override; webmail formunda isteğe bağlı **yeni tekrar anahtarı** (`newOccurrenceAnchorAt`).
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
- **Tüm seri** (tek PUT): `POST .../push/:eventId` — master `RRULE`, iptal edilen tekrarlar için `EXDATE`, düzenlenen örnekler için aynı dosyada ek `VEVENT` + `RECURRENCE-ID` (webmail: **CalDAV (tüm seri)**).
- **Bu tekrar** (override dosyası): `POST .../push/:eventId/occurrence` — `{ "occurrenceStartsAt" }` (webmail: **CalDAV (bu tekrar)**).
- **Bu tekrarı sil** sonrası seri CalDAV’a bağlıysa master `.ics` otomatik yenilenir (`EXDATE` eklenir); ayrı `_occ_<ms>.ics` dosyası uzaktan silinir.
- **CalDAV sync** gelen `.ics` içinden `EXDATE` → iptal istisnası, `RECURRENCE-ID` bileşenleri → override istisnası olarak içe alınır (`from_caldav=true`); uzakta kalkmış `EXDATE`/override yalnızca CalDAV kaynaklı istisnaları temizler — yerel-only (`from_caldav=false`) korunur.
- **Bu tekrarı düzenle** + CalDAV bağlıysa master seri güncellenir ve `_occ_<anchor>.ics` yeniden yazılır; `newOccurrenceAnchorAt` ile anchor taşınırsa eski `_occ_` dosyası silinir.

## VPS şema

```bash
bash scripts/apply-mail-d6-recurrence-schema.sh /var/www/nakliyeborsasi
bash scripts/apply-mail-d6-recurrence-exception-schema.sh /var/www/nakliyeborsasi
bash scripts/apply-mail-d6-occurrence-override-schema.sh /var/www/nakliyeborsasi
```
