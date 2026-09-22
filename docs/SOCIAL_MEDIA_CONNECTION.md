# Sosyal medya bağlantısı (Meta / Instagram)

Nakliye Borsası, firma Instagram istatistiklerini (gönderi, takipçi, takip) **anonim web taraması** yerine mümkün olduğunda **Meta Graph API** ile çeker. Bu, VPS IP engellerini ve işletme hesabı kısıtlarını aşmanın doğru yolu.

## 1. Meta Developer uygulaması

1. [developers.facebook.com](https://developers.facebook.com/) → **Uygulama oluştur** (İşletme türü).
2. Ürün olarak **Instagram Graph API** ve **Facebook Login** ekleyin.
3. Instagram **Business** veya **Creator** hesabını bir **Facebook Sayfası**na bağlayın.

## 2. Sunucu ortam değişkenleri (API)

`apps/api` veya VPS PM2 ortamında:

| Değişken | Açıklama |
|----------|----------|
| `META_GRAPH_ACCESS_TOKEN` | Uzun ömürlü sayfa/ kullanıcı erişim jetonu (Graph API) |
| `META_INSTAGRAM_ACTOR_ID` | Bağlı Instagram Business hesabının **sayısal** kimliği (IG User ID) |

Jeton, `business_discovery` ile diğer işletme kullanıcı adlarının istatistiklerini okumak için yeterli izinlere sahip olmalıdır.

## 3. Admin panelde kullanım

**Organizasyonlar → Düzenle → Sosyal medya**

- Üstte **Platform Instagram (Meta Graph)** durumu görünür.
- Yapılandırma tamamsa **İstatistikleri güncelle** önce Graph API’yi dener.
- Henüz bağlı değilse sayıları elle girebilir veya token’ları yapılandırıp yeniden deneyebilirsiniz.

## 4. API olmadan: tarayıcı yardımcısı (admin)

Instagram panel içine **iframe ile gömülemez** (güvenlik + Meta politikası). Bunun yerine:

1. Admin → Organizasyon → Sosyal medya → **NB Instagram sayıları** yer imini tarayıcıya ekleyin.
2. **Firma profilini Instagram'da aç** (kayıtlı URL).
3. Girişli Instagram sekmesinde yer imine tıklayın → gönderi / takipçi / takip alanları dolar.
4. **Kaydet**.

Bu yöntem sizin oturumunuzu kullanır; sunucu IP engeline takılmaz.

## 5. Tam otomasyon önergesi (Meta Graph OAuth)

Firma bazlı **Instagram Business bağla** akışı, veritabanı, API uçları, faz planı ve Meta App Review süreci:

**→ [META_GRAPH_OAUTH_ONERGE.md](./META_GRAPH_OAUTH_ONERGE.md)** (ayrıntılı önerge)

Özet: Her firma OAuth ile kendi hesabını bağlar; token sunucuda şifreli saklanır; metrikler Graph API ile cron/manuel senkron edilir. Geçiş döneminde tarayıcı yardımcısı (§4) yedek kalır.
