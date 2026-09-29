# Mesajlar — faz planı (deploy sırası)

| Faz | Kapsam | Deploy |
|-----|--------|--------|
| **P0** | Bildirim, `?email=`→compose, modül `beta`, pilot metin, SSO origin env | ✅ kod (DNS operatör) |
| **P1** | Sohbet thread zengin liste, `freightListingId`, embed tam ekran, hızlı kutu kaldır | ✅ kod |
| **P2** | Okundu, MailAdmin compose, güven rozeti, HTML compose (varsayılan zengin), sohbet arama | ✅ kod |
| **P3** | Yapılandırılmış özet, çeviri API, KVKK export, admin eDiscovery, canlı yenileme | ✅ kod |
| **P4** | Sohbet dosya ekleri, web push bildirimleri (`messaging-push-sw.js`) | ✅ kod |
| **FS-1** | SSE polling kapatma + exponential reconnect, XLSX ek, `/messaging/status` bayrakları | ✅ kod · `verify-firma-sohbeti-fs1.sh` |
| **FS-2** | Sunucu arama, markdown, şablonlar, ilan kartı, teklif timeline, AI özet | ✅ kod · `verify-firma-sohbeti-fs2.sh` |
| **FS-3** | Okundu (kullanıcı), typing, iç not, düzenle/sil, @mention, çeviri DE/RU | ✅ kod · `verify-firma-sohbeti-fs3.sh` |
| **FS-4** | Redis SSE fan-out, thread legal hold, mesaj CRUD audit (IP/UA), eDiscovery ZIP+SHA-256, rate limit/dk | ✅ kod · `verify-firma-sohbeti-fs4.sh` · `smoke-messaging-sse-load.sh` |
| **FS-5** | Webhook HMAC, Public API `messaging:read`, retention job, sohbetten sabit fiyat kabul, push matris satırı | ✅ kod · `verify-firma-sohbeti-fs5.sh` |

**Çeviri (ops):** `MESSAGING_TRANSLATE_API_URL` → LibreTranslate uyumlu POST (ör. `https://libretranslate.com/translate`)

**Push (ops):** Ayrı `MESSAGING_WEB_PUSH_VAPID_*` — [MESSAGING_WEB_PUSH.md](./MESSAGING_WEB_PUSH.md) · `apply-messaging-web-push-vps-env.sh`

**Ek depolama:** `MESSAGING_ATTACHMENT_ROOT` (varsayılan `data/messaging-attachments`) — en fazla **5×10 MB**; PDF, görsel, metin, **XLSX/XLS**

**FS-4 (ops):** `REDIS_URL` + isteğe bağlı `MESSAGING_SSE_REDIS_FANOUT=1` · `MESSAGING_RATE_LIMIT_PER_MINUTE` (varsayılan 120) · `scripts/apply-messaging-fs4-schema.sh`

**P0 DNS (operatör):** `bash scripts/print-instant-post-dns-isimtescil.sh` → isimtescil `post.lerta.com.tr` · doğrulama: `bash scripts/verify-lerta-post-dns.sh` (2026-09: zone henüz NXDOMAIN)

**%100 parite (mail + mesaj):** [LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md](./LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md) — PM-1…PM-10

**Üst seviye firma sohbeti (FS-1…FS-7):** [FIRMA_SOHBETI_COMPETITIVE_ROADMAP.md](./FIRMA_SOHBETI_COMPETITIVE_ROADMAP.md) — rakip analizi + faz planı (P0–P4 sonrası)
