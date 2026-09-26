# Harici takvim — iCal URL (CalDAV öncesi)

Webmail **Takvim** → **Harici takvim (iCal URL)** bölümü, org düzeyinde HTTPS iCal aboneliği sunar. Nextcloud, Google Calendar (gizli adres), Outlook webcal bağlantıları için uygun adımdır; tam **CalDAV** okuma/yazma sonraki faz.

## Kullanım

1. Harici servisten **iCal / ICS** abonelik URL’si alın (HTTPS zorunlu).
2. Webmail → Takvim → Ad + URL → **Ekle** (firma sahibi / posta yöneticisi).
3. **Senkronize** veya **Tümünü senkronize et** — etkinlikler org takvimine aktarılır (`UID` ile güncellenir).
4. **Otomatik** — etkin (`enabled`) akışlar API arka plan işinde periyodik çekilir (varsayılan 1 saat).

## API

| Yöntem | Yol |
|--------|-----|
| GET | `calendar/feeds` |
| POST | `calendar/feeds` `{ label, feedUrl, enabled? }` |
| PATCH | `calendar/feeds/:feedId` |
| DELETE | `calendar/feeds/:feedId` |
| POST | `calendar/feeds/:feedId/sync` |
| POST | `calendar/feeds/sync-all` |

Senkronize edilen etkinlikler `mail_calendar_event.ics_feed_id` + `external_uid` ile işlenir.

## Güvenlik

- Yalnızca **HTTPS** URL; localhost ve özel IP aralıkları engellenir.
- Sunucu tarafı `fetch` (20 sn timeout); en fazla **5** akış / org.

## Ortam

| Değişken | Açıklama |
|----------|----------|
| `MAIL_CALENDAR_ICS_SYNC_INTERVAL_MS` | Otomatik senkron aralığı (ms). Varsayılan `3600000` (1 saat); minimum `60000`. |

Arka plan işi yalnızca `MailRuntimeRoleService.shouldRunBackgroundJobs()` true olan API süreçlerinde çalışır (digest/snooze ile aynı model).

## VPS şema

```bash
bash scripts/apply-mail-d6-external-ics-feed-schema.sh /var/www/nakliyeborsasi
```

## Sonraki

- CalDAV PROPFIND/REPORT, kimlik bilgisi güvenli depolama
- CardDAV kişi senkronu
