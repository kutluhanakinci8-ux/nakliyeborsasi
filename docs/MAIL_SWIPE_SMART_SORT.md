# Mobil kaydırma ve akıllı sıralama

## Kaydırma aksiyonu (tam eşleme)

**Posta → Onaylar ve hareketler → Kaydırma aksiyonu** (`swipePrimaryAction`):

| Değer | Birincil düğme | Tam kaydırma (≈%90) |
|-------|----------------|---------------------|
| `archive` | Arşiv | Arşivle |
| `delete` | Sil | Çöp / kalıcı sil |
| `read` | Okundu / Okunmadı | Okundu durumunu değiştir |

İkincil düğme her zaman listede kalır (arşiv veya sil).

## Akıllı sıralama

**Posta → Gelişmiş → Akıllı sıralama** (`inboxSmartSortEnabled`, varsayılan açık).

Gelen kutusunda (arama/konuşma görünümü kapalı) mesajlar önem skoruna göre sıralanır: yıldız, okunmamış, odaklı gelen kutusu kuralları, ek, güncellik, bülten cezası.

SQL: `scripts/sql/mail-inbox-smart-sort.sql`
