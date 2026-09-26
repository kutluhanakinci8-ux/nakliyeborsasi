# Tekrarlayan takvim etkinlikleri (D6)

Org takviminde **günlük / haftalık / aylık** tekrar; liste görünümünde aralık içinde genişletilir.

## Webmail

Takvim → yeni etkinlik → **Tekrar** seçimi; isteğe bağlı **bitiş tarihi**.

- Silme: tüm seriyi kaldırır (tek örnek silme sonraki faz).
- Ay ızgarasında tekrarların her örneği gün noktası olarak görünür.

## API

`POST/PATCH calendar/events` alanları:

- `recurrenceFrequency`: `daily` | `weekly` | `monthly` (yok = tekrar yok)
- `recurrenceUntil`: ISO (isteğe bağlı)

`GET calendar/events` yanıtı:

- `recurrenceRule`, `recurrenceUntil`, `isRecurrenceOccurrence`
- Tekrarlı etkinlikler `from`–`to` aralığında çoğaltılır.

## iCal

- İçe/dışa aktarma `RRULE` (FREQ=DAILY|WEEKLY|MONTHLY).
- CalDAV **PUT** tekrar kuralını içerir.

## VPS şema

```bash
bash scripts/apply-mail-d6-recurrence-schema.sh /var/www/nakliyeborsasi
```
