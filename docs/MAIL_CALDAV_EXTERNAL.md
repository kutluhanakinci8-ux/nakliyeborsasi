# Harici takvim — iCal URL (CalDAV öncesi)

Webmail **Takvim** → **Harici takvim (iCal URL)** bölümü, org düzeyinde HTTPS iCal aboneliği sunar. Nextcloud, Google Calendar (gizli adres), Outlook webcal bağlantıları için uygun adımdır; tam **CalDAV** okuma/yazma sonraki faz.

## Kullanım

1. Harici servisten **iCal / ICS** abonelik URL’si alın (HTTPS zorunlu).
2. Webmail → Takvim → Ad + URL → **Ekle** (firma sahibi / posta yöneticisi).
3. **Senkronize** — etkinlikler org takvimine aktarılır (`UID` ile güncellenir).

## API

| Yöntem | Yol |
|--------|-----|
| GET | `calendar/feeds` |
| POST | `calendar/feeds` `{ label, feedUrl, enabled? }` |
| PATCH | `calendar/feeds/:feedId` |
| DELETE | `calendar/feeds/:feedId` |
| POST | `calendar/feeds/:feedId/sync` |

Senkronize edilen etkinlikler `mail_calendar_event.ics_feed_id` + `external_uid` ile işlenir.

## Güvenlik

- Yalnızca **HTTPS** URL; localhost ve özel IP aralıkları engellenir.
- Sunucu tarafı `fetch` (20 sn timeout); en fazla **5** akış / org.

## VPS şema

```bash
bash scripts/apply-mail-d6-external-ics-feed-schema.sh /var/www/nakliyeborsasi
```

## Sonraki

- CalDAV PROPFIND/REPORT, kimlik bilgisi güvenli depolama
- CardDAV kişi senkronu
