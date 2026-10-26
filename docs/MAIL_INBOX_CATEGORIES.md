# Gelen kutusu kategorileri (Lerta Posta)

## Rakiplerde nasıl çalışıyor?

### Microsoft Outlook

1. **Odaklanmış / Diğer** — Gelen kutusu iki sekmeye ayrılır. Sınıflandırma gelen mesajlarda çalışır; kullanıcı taşıma ve **“Her zaman … taşı”** ile gönderen bazlı override oluşturur (`inferenceClassification` / Graph API).
2. **Renkli kategoriler** — Kullanıcı (veya kural) mesaja **Kişisel, İş, Faturalama** vb. etiket atar. Filtre menüsündeki **“Kategorilere ayrılmış”**, Outlook’ta *kategori etiketi atanmış* öğeleri gösterir; otomatik sekme değildir.
3. **Öğrenme** — Taşıma ve override ile zamanla iyileşir; yalnızca gelen kutusu gelenleri için.

### Gmail

1. **Sekmeler** — Primary, Social, Promotions, Updates, Forums (ML + sinyaller: gönderen, içerik, kullanıcı etkileşimi).
2. **Öğretme** — Sekmeler arası sürükle-bırak, filtre, kişi ekleme, yanıtlama.
3. **Özel sekme yok** — Kullanıcı yeni sekme tanımlayamaz; **etiketler** ile özelleştirme yapılır.

### Apple Mail

Akıllı posta kutuları (öncelikli, güncellemeler, promosyonlar) + kullanıcı kuralları; sekme/kutu ayrımı Gmail/Outlook’a benzer hibrit.

## Lerta Posta modeli (hibrit, Outlook filtre + Gmail sekmeleri)

| Kavram | Lerta alanı | Kullanıcıya nasıl görünür |
|--------|-------------|---------------------------|
| Odaklanmış / Diğer | `ai_focus_lane` | Komut çubuğu sekmeleri (mevcut) |
| Kullanıcı kategorisi (Outlook etiket) | `user_inbox_category_id` → `mail_user_inbox_category` | Ayarlar → Kategoriler; okuma paneli; filtre menüsü |
| Otomatik içerik ipucu (arka plan) | `inbox_category` | AI/kural; kullanıcı rozeti değil |
| Gönderen kuralı | `mail_inbox_category_override` | “Bu gönderenden gelenleri her zaman …” |
| Özel klasör | `custom_folder_id` | Sol menü klasörleri (mevcut) |

**Kategori değerleri:** `promotions`, `updates`, `social`, `forums`, `commercial` (+ atanmamış = birincil gelen kutusu).

**“Kategorilere ayrılmış” filtresi:** `inbox_category` dolu olan mesajlar (birincil/atanmamış hariç).

**Otomatik atama sırası:**

1. Gönderen override (veritabanı)
2. Kurallar tabanlı sınıflandırma (`classifyInbound` / arka plan `refresh-ai-focus`)
3. İstemci heuristik (bağlı Gmail/Graph henüz kategorilenmemiş satırlar için yedek)

**Kullanıcı eylemleri:**

- Okuma paneli: kategori seç → mesaj güncellenir.
- “Bu gönderenden her zaman” → override kaydı; yeni gelenler aynı kategori.

## API

- `POST …/messages/:id/classify` — odak + kategori
- `PATCH …/messages/:id/inbox-category` — `{ category, applyToSender? }`
- `POST …/inbox/refresh-ai-focus` — toplu odak + kategori (atanmamışlar)

SQL: `scripts/sql/mail-inbound-inbox-category.sql`
