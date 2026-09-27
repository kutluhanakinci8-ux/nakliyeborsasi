# Mesajlar — faz planı (deploy sırası)

| Faz | Kapsam | Deploy |
|-----|--------|--------|
| **P0** | Bildirim, `?email=`→compose, modül `beta`, pilot metin, SSO origin env | ✅ kod (DNS operatör) |
| **P1** | Sohbet thread zengin liste, `freightListingId`, embed tam ekran, hızlı kutu kaldır | ✅ kod |
| **P2** | Okundu, MailAdmin compose, güven rozeti, HTML compose (varsayılan zengin), sohbet arama | ✅ kod |
| **P3** | Yapılandırılmış özet, çeviri API, KVKK export, admin eDiscovery, canlı yenileme | ✅ kod |

**Çeviri (ops):** `MESSAGING_TRANSLATE_API_URL` → LibreTranslate uyumlu POST (ör. `https://libretranslate.com/translate`)

**P0 DNS (operatör):** `bash scripts/print-instant-post-dns-isimtescil.sh` → isimtescil `post.lerta.com.tr`
