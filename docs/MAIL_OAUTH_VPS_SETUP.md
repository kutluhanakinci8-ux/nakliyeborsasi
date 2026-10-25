# VPS OAuth kurulumu (UAT M3 / M4)

**Hedef:** `posta.lerta.com.tr` üzerinde Exchange/Graph ve Google Takvim bağlantısı.

## 1. Azure (M3)

1. App registration → redirect URI:
   - `https://posta.lerta.com.tr/mail/exchange-oauth`
   - `https://posta.lerta.com.tr/mail/calendar-oauth`
2. VPS `/var/www/nakliyeborsasi/.env`:

```bash
MICROSOFT_GRAPH_MAIL_CLIENT_ID=...
MICROSOFT_GRAPH_MAIL_CLIENT_SECRET=...
MICROSOFT_GRAPH_MAIL_REDIRECT_URI=https://posta.lerta.com.tr/mail/exchange-oauth
# İsteğe bağlı anlık push (CAP-5); boşsa varsayılan public URL kullanılır
# MICROSOFT_GRAPH_MAIL_WEBHOOK_URL=https://posta.lerta.com.tr/api/v1/public/mail-connected/microsoft/graph
# İsteğe bağlı ayrı takvim uygulaması:
# MICROSOFT_GRAPH_CALENDAR_CLIENT_ID=...
# MICROSOFT_GRAPH_CALENDAR_CLIENT_SECRET=...
MICROSOFT_GRAPH_CALENDAR_REDIRECT_URI=https://posta.lerta.com.tr/mail/calendar-oauth
```

3. `systemctl restart nakliyeborsasi-api` (veya deploy script).
4. Doğrula: `bash scripts/verify-uat-oauth-env.sh`

Detay: [MAIL_GRAPH_CALENDAR.md](./MAIL_GRAPH_CALENDAR.md)

## 2. Google (M4)

1. Cloud Console → OAuth client (Web) → redirect:
   - `https://posta.lerta.com.tr/mail/google-calendar-oauth`
2. VPS `.env`:

```bash
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
GOOGLE_CALENDAR_REDIRECT_URI=https://posta.lerta.com.tr/mail/google-calendar-oauth
```

3. API yeniden başlat + `verify-uat-oauth-env.sh`.

Detay: [MAIL_GOOGLE_CALENDAR.md](./MAIL_GOOGLE_CALENDAR.md)

## 2b. Gmail posta (CAP-3 / CAP-4)

1. Cloud Console → Gmail API etkin → OAuth redirect:
   - `https://posta.lerta.com.tr/mail/gmail-oauth`
2. VPS `.env`:

```bash
GOOGLE_GMAIL_CLIENT_ID=...
GOOGLE_GMAIL_CLIENT_SECRET=...
GOOGLE_GMAIL_REDIRECT_URI=https://posta.lerta.com.tr/mail/gmail-oauth
# İsteğe bağlı anlık push (CAP-5):
# GOOGLE_GMAIL_PUBSUB_TOPIC=projects/.../topics/...
# Pub/Sub push aboneliğinde özel HTTP başlığı (önerilir):
# GOOGLE_GMAIL_PUBSUB_PUSH_SECRET=uzun-rastgele-deger
# Başlık adı: x-lerta-gmail-push-secret
```

3. API yeniden başlat.
4. Canlı doğrulama (secret gerçekten Google’da geçerli mi):

```bash
bash scripts/verify-uat-oauth-env.sh
# Beklenen: "OK: Gmail client_id + client_secret Google tarafından tanınıyor"
# FAIL: client_secret geçersiz → Console’da aynı Web client için **Create new client secret**,
#       VPS `.env` güncelle, `pm2 restart nakliyeborsasi-api`
```

**Not:** `client_id` ve `client_secret` aynı OAuth “Web application” kaydına ait olmalı; redirect URI birebir `GOOGLE_GMAIL_REDIRECT_URI` ile eşleşmeli.

## 3. Smoke

Posta → Ayarlar → Takvim → Microsoft / Google bağla → test etkinlik oluştur.
