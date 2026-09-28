# Lerta Post webmail — Ayarlar (Outlook referansı)

Outlook mobil ayarlar ekranına göre mevcut durum ve faz planı.

## Karşılaştırma

| Outlook | Lerta Post (şimdi) | Durum |
|---------|-------------------|--------|
| Ayarlar arama | — | ❌ S-A1 |
| Gruplu liste + ikon satırları | Yatay sekmeler (IMAP, imza, …) | 🔄 S-A1 |
| **Ekran ve görünüm** | Tema FAB (☾/☀), ayarlarda değil | 🔄 S-A1 |
| **İmza** | İmza / şablon sekmesi | ✅ |
| **Otomatik yanıtlar** | Ayarlar + inbound tetikleme | ✅ S-A2 |
| **Bildirimler ve sesler** | Push, ses, günlük özet | ✅ (S-A1’de tek satır) |
| **Hesaplar** | Tek kurumsal kutu + IMAP | ⚠️ kısmi |
| **Posta** (yoğunluk, varsayılan) | Liste yoğunluğu + kurallar, klasörler | ✅ yoğunluk S-A3 |
| **Takvim** ayarları | Ayarlarda CalDAV özet + senkron | ✅ S-A3 |
| **Kişiler** ayarları | Ayarlarda CardDAV özet + senkron | ✅ S-A3 |
| Biyometri / Face ID | Web: TOTP 2FA | ⚠️ farklı platform |
| **Gizlilik** | JSON export + konsol bağlantısı | ✅ S-A3 |
| Eklentiler / entegrasyonlar | IMAP, public API (plan) | ⚠️ kısmi |
| Yardım ve geri bildirim | `/help/imap` | ⚠️ S-A3 |
| Varsayılan e-posta uygulaması | Mobil OS | — (N/A web) |

## Fazlar

| Faz | Kapsam | Deploy |
|-----|--------|--------|
| **S-A1** | Outlook tarzı ayar merkezi: arama, gruplar, drill-down; görünüm (açık/koyu) ayarlarda | ✅ kod |
| **S-A2** | Otomatik yanıt (API + şablon + aç/kapa + tarih aralığı) | ✅ kod |
| **S-A3** | Posta tercihleri (liste yoğunluğu), takvim/kişi kısayolları, gizlilik/yarım linkleri | ✅ kod |
| **S-A4** | Hesaplar özeti (gönderen kimlikleri, alias), gelişmiş entegrasyonlar | PM-3 ([parite planı](./LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md)) |
