# Faz A — DNS (isimtescil.net) + Postmark

Alan adları panelinizde: **lerta.tr**, **lerta.com.tr** (aktif). Önerilen gönderim hostu: **`mail.lerta.tr`** (alt alan; kök `lerta.tr` web sitesini bozmaz).

## 1. Postmark

1. [Postmark](https://postmarkapp.com) → Server → **Sender Signatures** veya **Domains**.
2. `mail.lerta.tr` ekleyin; paneldeki **DKIM** ve **Return-Path** CNAME değerlerini kopyalayın.
3. Server **API token** → VPS `POSTMARK_SERVER_TOKEN`.
4. Webhook: URL admin → **Politika & ESP** (Postmark URL); `POSTMARK_WEBHOOK_TOKEN` ile doğrulama.

## 2. isimtescil DNS (lerta.tr)

Ürün listesinde **lerta.tr** → DNS yönetimi (veya **Toplu Dns Güncelle**).

| Tür | Host / ad | Değer | Açıklama |
|-----|-----------|--------|----------|
| TXT | `mail.lerta.tr` | `v=spf1 include:spf.mtasv.net ~all` | Postmark SPF |
| CNAME | Postmark DKIM host (ör. `pm._domainkey.mail.lerta.tr`) | Postmark hedefi | Panelden aynen |
| CNAME | `pm-bounces.mail.lerta.tr` | `pm.mtasv.net` | Bounce (Postmark önerisi) |
| TXT | `_dmarc.lerta.tr` | `v=DMARC1; p=none; rua=mailto:dmarc@lerta.tr` | İlk aşama p=none |

Not: Host alanında bazen sadece `mail` veya `pm._domainkey.mail` yazılır; panelin “tam ad / göreli ad” formatına uyun.

## 3. VPS `.env` (üretim)

```bash
MAIL_PLATFORM_DOMAIN=mail.lerta.tr
MAIL_PLATFORM_FROM_EMAIL=notifications@mail.lerta.tr
EMAIL_DELIVERY_PROVIDER=postmark
POSTMARK_SERVER_TOKEN=...
POSTMARK_FROM=Lerta Logistics <notifications@mail.lerta.tr>
POSTMARK_WEBHOOK_TOKEN=...
POSTMARK_DKIM_HOST=<Postmark DKIM host>
POSTMARK_DKIM_TARGET=<Postmark DKIM target>
SMTP_PROFILE=custom
```

Gmail relay (`SMTP_PROFILE=gmail`) üretim gönderiminde kapatılır; operasyon okuma için Gmail API ayrı kalabilir.

## 4. Doğrulama

Admin → **E-posta ve operasyon merkezi** → **Platform gönderim** sekmesi: SPF/DKIM/DMARC ve ESP maddeleri yeşile dönmeli. Test e-postası **Operasyon** sekmesinden gönderin; outbox’ta `From` adresini kontrol edin.

## 5. lerta.com.tr

Marka için ikinci domain gerekiyorsa aynı kayıtlar `mail.lerta.com.tr` için tekrarlanır; Postmark’ta ayrı domain doğrulaması gerekir.
