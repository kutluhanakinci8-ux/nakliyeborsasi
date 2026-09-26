# D6 — Takvim ve kişiler (MVP uygulandı)

Org düzeyinde **basit takvim** ve **kişi listesi** webmail içinde; harici CalDAV/CardDAV sunucu köprüsü sonraki faz.

## Webmail

Sol menü → **Takvim** / **Kişiler**

- Etkinlik ekle/sil, ay görünümü listesi
- Kişi ekle/sil, listeden **Yaz** ile compose
- **.ics** içe/dışa aktarma (takvim)
- **.vcf** içe/dışa aktarma (kişiler)
- Ay **ızgarası** (gün seç → liste filtresi)

## API (`company/mail-inbox`)

| Yöntem | Yol |
|--------|-----|
| GET | `calendar/events?from=&to=` (ISO) |
| POST | `calendar/events` |
| PATCH | `calendar/events/:eventId` |
| DELETE | `calendar/events/:eventId` |
| GET | `calendar/export.ics?from=&to=` |
| POST | `calendar/import` `{ "ics": "..." }` |
| GET | `contacts` |
| POST | `contacts` |
| PATCH | `contacts/:contactId` |
| DELETE | `contacts/:contactId` |
| GET | `contacts/export.vcf` |
| POST | `contacts/import` `{ "vcf": "..." }` |

Veri `mail_calendar_event` ve `mail_org_contact` tablolarında; org (`companyId`) ile sınırlı.

## VPS şema

```bash
bash scripts/apply-mail-d6-calendar-contacts-schema.sh /var/www/nakliyeborsasi
```

`deploy-posta-lerta-com-tr.sh` bu scripti otomatik çağırır.

## D6+ (uygulandı)

- Takvim ay ızgarası + gün filtresi
- Kişi `.vcf` içe aktarma

## Sonraki (plan)

- Harici CalDAV/CardDAV hesap bağlama (Nextcloud vb.)
- Tekrarlayan etkinlikler, çok günlü etkinlik çubuğu

## İlgili

- [MAIL_WEBMAIL_UX_ROADMAP.md](./MAIL_WEBMAIL_UX_ROADMAP.md)
