# E-posta F3 / F4 — politika, suppression, ESP

## F3 — Operasyon matrisi

- Olay kataloğu: `NotificationEventCatalog` (ihale, teklif, mesaj + auth).
- Kullanıcı tercihleri: `PATCH /api/v1/me/notification-preferences` (profil bildirim anahtarları).
- Firma ek alıcıları: `company_notification_preferences.extraRecipientEmails`.
- Suppression: `email_suppressions` — outbox gönderiminden önce kontrol.
- İhale teklifi: `placeBid` sonrası `AUCTION_BID_PLACED` / `AUCTION_OUTBID` e-postaları.

## F4 — ESP hibrit

| Değişken | Açıklama |
|----------|----------|
| `EMAIL_DELIVERY_PROVIDER` | `smtp` (varsayılan) veya `postmark` |
| `POSTMARK_SERVER_TOKEN` | Postmark server API token |
| `POSTMARK_FROM` | İsteğe bağlı From |
| `POSTMARK_WEBHOOK_TOKEN` | `X-Postmark-Webhook-Token` doğrulama |

Webhook URL’leri (admin → Politika & ESP):

- Postmark: `POST /api/v1/email/webhooks/postmark`
- Amazon SES (SNS): `POST /api/v1/email/webhooks/ses`

Gmail bounce tarama: `POST /api/v1/platform-admin/gmail/sync-bounces` (mailer-daemon konuları).

## Olgunluk skoru

F1–F4 tamamlandığında panel **%100** hedef bandını gösterir (Postmark token yoksa ~%96).
