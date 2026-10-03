# Instagram API with Instagram Login (Lerta)

Meta dokümantasyonu: [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login).

## Scope’lar (2025+)

Lerta OAuth isteği:

- `instagram_business_basic`
- `instagram_business_manage_messages`
- `instagram_business_manage_comments`

Eski `business_*` scope değerleri kullanılmaz.

## Meta App Dashboard

1. **Instagram → API setup with Instagram login → Business login settings**
   - **Instagram App ID** ve **Instagram App Secret** (üstteki Meta App ID ile aynı değildir).
   - Redirect URI: `https://app.lerta.com.tr/api/v1/company/social-hub/oauth/callback`
2. Webhooks: `messages` alanı açık; `object=instagram` bildirimleri API’ye düşmeli.

## VPS `.env`

```bash
SOCIAL_META_INSTAGRAM_APP_ID=<Instagram App ID>
SOCIAL_META_INSTAGRAM_APP_SECRET=<Instagram App Secret>
SOCIAL_META_INSTAGRAM_OAUTH_USE_LOGIN=1
SOCIAL_META_INSTAGRAM_BUSINESS_ACCOUNT_ID=17841426757865914   # opsiyonel webhook routing
```

Kurulum:

```bash
SOCIAL_META_INSTAGRAM_APP_ID=... SOCIAL_META_INSTAGRAM_APP_SECRET=... \
  bash scripts/apply-instagram-login-vps-env.sh
```

## Kod davranışı

| Mod | OAuth | Mesaj gönder | Gelen kutusu sync |
|-----|--------|--------------|-------------------|
| `instagram_login` | `instagram.com/oauth/authorize` | `graph.instagram.com/.../messages` | `graph.instagram.com/me/conversations` |
| `facebook_page` | `facebook.com/dialog/oauth` + `config_id` | `graph.facebook.com/{pageId}/messages` | Page token + `platform=instagram` |

Facebook Page bağlamadan DM için **Instagram Login** modu gerekir.

## Test

Development modda yalnızca **Instagram Tester** hesaplarından `@lertalogistics`’e metin DM atın. Webhook log: `kinds=[message]` (sadece `read` yeterli değildir).
