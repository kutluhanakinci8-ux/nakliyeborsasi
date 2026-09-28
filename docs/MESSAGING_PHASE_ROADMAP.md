# Mesajlar — faz planı (deploy sırası)

| Faz | Kapsam | Deploy |
|-----|--------|--------|
| **P0** | Bildirim, `?email=`→compose, modül `beta`, pilot metin, SSO origin env | ✅ kod (DNS operatör) |
| **P1** | Sohbet thread zengin liste, `freightListingId`, embed tam ekran, hızlı kutu kaldır | ✅ kod |
| **P2** | Okundu, MailAdmin compose, güven rozeti, HTML compose (varsayılan zengin), sohbet arama | ✅ kod |
| **P3** | Yapılandırılmış özet, çeviri API, KVKK export, admin eDiscovery, canlı yenileme | ✅ kod |
| **P4** | Sohbet dosya ekleri (2×2,5 MB), web push bildirimleri (`messaging-push-sw.js`) | ✅ kod |

**Çeviri (ops):** `MESSAGING_TRANSLATE_API_URL` → LibreTranslate uyumlu POST (ör. `https://libretranslate.com/translate`)

**Push (ops):** `MESSAGING_WEB_PUSH_VAPID_*` veya mevcut `MAIL_WEB_PUSH_VAPID_*` anahtarları · `MESSAGING_WEB_PUBLIC_URL` (varsayılan `https://app.lerta.com.tr`)

**Ek depolama:** `MESSAGING_ATTACHMENT_ROOT` (varsayılan `data/messaging-attachments`)

**P0 DNS (operatör):** `bash scripts/print-instant-post-dns-isimtescil.sh` → isimtescil `post.lerta.com.tr` · doğrulama: `bash scripts/verify-lerta-post-dns.sh` (2026-09: zone henüz NXDOMAIN)

**%100 parite (mail + mesaj):** [LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md](./LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md) — PM-1…PM-10
