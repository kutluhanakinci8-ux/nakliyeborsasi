# Lerta Post webmail — Ayarlar (Outlook referansı)

Outlook mobil ayarlar ekranına göre mevcut durum ve faz planı.

## Karşılaştırma

| Outlook | Lerta Post (şimdi) | Durum |
|---------|-------------------|--------|
| Ayarlar arama | Ayar merkezi arama | ✅ S-A1 |
| Gruplu liste + ikon satırları | Hub grupları + drill-down | ✅ S-A1 |
| **Ekran ve görünüm** | Ayarlar → Ekran ve görünüm | ✅ S-A1 |
| **İmza** | İmza / şablon sekmesi | ✅ |
| **Otomatik yanıtlar** | Ayarlar + inbound tetikleme | ✅ S-A2 |
| **Bildirimler ve sesler** | Push, ses, günlük özet | ✅ |
| **Hesaplar** | Ayarlar → Hesaplar ve gönderenler | ✅ S-A4 |
| **Posta** (yoğunluk, varsayılan) | Liste yoğunluğu + kurallar, klasörler | ✅ S-A3 |
| **Takvim** ayarları | CalDAV özet + senkron | ✅ S-A3 |
| **Kişiler** ayarları | CardDAV özet + senkron | ✅ S-A3 |
| Biyometri / Face ID | WebAuthn passkey + posta kilidi | ✅ |
| **Gizlilik** | JSON export + konsol bağlantısı | ✅ S-A3 |
| Eklentiler / entegrasyonlar | Hub → Entegrasyonlar (IMAP, CalDAV, API) | ✅ |
| Yardım ve geri bildirim | Yardım merkezi + `mailto:destek@lerta.com.tr` | ✅ |
| Varsayılan e-posta uygulaması | Mobil OS | — (N/A web) |

## Fazlar

| Faz | Kapsam | Deploy |
|-----|--------|--------|
| **S-A1** | Outlook tarzı ayar merkezi: arama, gruplar, drill-down; görünüm (açık/koyu) ayarlarda | ✅ kod |
| **S-A2** | Otomatik yanıt (API + şablon + aç/kapa + tarih aralığı) | ✅ kod |
| **S-A3** | Posta tercihleri (liste yoğunluğu), takvim/kişi kısayolları, gizlilik/yarım linkleri | ✅ kod |
| **S-A4** | Hesaplar özeti (gönderen kimlikleri, alias), gelişmiş entegrasyonlar | ✅ PM-3 |
| **S-A5** | Passkey / posta kilidi, Outlook mobil IMAP satırları, entegrasyon hub | ✅ kod |

## İlgili

- [MAIL_BIOMETRIC_APP_LOCK.md](./MAIL_BIOMETRIC_APP_LOCK.md)
- [MAIL_THUNDERBIRD_IMAP.md](./MAIL_THUNDERBIRD_IMAP.md)
