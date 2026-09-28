# Mesajlar — faz planı (deploy sırası)

| Faz | Kapsam | Deploy |
|-----|--------|--------|
| **P0** | Bildirim, `?email=`→compose, modül `beta`, pilot metin, SSO origin env | ✅ kod (DNS operatör) |
| **P1** | Sohbet thread zengin liste, `freightListingId`, embed tam ekran, hızlı kutu kaldır | ✅ kod |
| **P2** | Okundu, MailAdmin compose, güven rozeti, HTML compose (varsayılan zengin), sohbet arama | ✅ kod |
| **P3** | Yapılandırılmış özet, çeviri API, KVKK export, admin eDiscovery, canlı yenileme | ✅ kod |
| **P4** | Sohbet dosya ekleri (2×2,5 MB), web push bildirimleri (`messaging-push-sw.js`) | ✅ kod |
| **P5** | Slack derinliği: org kanalları, bot webhook, kurumsal arama | ✅ kod · `MESSAGING_SLACK_DEPTH.md` |

**Çeviri (ops):** `MESSAGING_TRANSLATE_API_URL` → LibreTranslate uyumlu POST (ör. `https://libretranslate.com/translate`)

**Push (ops):** Ayrı `MESSAGING_WEB_PUSH_VAPID_*` — [MESSAGING_WEB_PUSH.md](./MESSAGING_WEB_PUSH.md) · `apply-messaging-web-push-vps-env.sh`

**Ek depolama:** `MESSAGING_ATTACHMENT_ROOT` (varsayılan `data/messaging-attachments`)

**P0 DNS (operatör):** `bash scripts/print-instant-post-dns-isimtescil.sh` → isimtescil `post.lerta.com.tr` · doğrulama: `bash scripts/verify-lerta-post-dns.sh` (2026-09: zone henüz NXDOMAIN)

**%100 parite (mail + mesaj):** [LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md](./LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md) — PM-1…PM-10
