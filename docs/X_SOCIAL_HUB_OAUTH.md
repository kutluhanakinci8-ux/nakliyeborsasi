# X (Twitter) — Sosyal Hub OAuth (@lertalogistics)

Lerta Sosyal medya → **Yol haritası → X (Twitter)** kartı, sunucuda OAuth 2.0 (PKCE) ile hesap bağlar. Gelen kutusu / DM köprüsü ayrı faz (ücretli X API katmanı).

## 1. X Developer Portal

1. [developer.x.com](https://developer.x.com/) → Proje + **User authentication** uygulaması.
2. **OAuth 2.0** açık, **Type of App**: Web App.
3. **Callback URL** (Meta ile aynı köprü):

   `https://app.lerta.com.tr/api/v1/company/social-hub/oauth/callback`

4. **Website URL**: `https://app.lerta.com.tr`
5. Bağlanacak hesap: kurumsal **@lertalogistics** (girişte bu kullanıcıyı seçin).

## 2. VPS `.env` (PM2 `nakliyeborsasi-api`)

```bash
SOCIAL_X_OAUTH_CLIENT_ID=<Client ID>
SOCIAL_X_OAUTH_CLIENT_SECRET=<Client Secret>
# Opsiyonel; varsayılan: tweet.read tweet.write users.read offline.access
# SOCIAL_X_OAUTH_SCOPES=tweet.read tweet.write users.read offline.access
# SOCIAL_X_OAUTH_REDIRECT_URI=https://app.lerta.com.tr/api/v1/company/social-hub/oauth/callback
```

`SOCIAL_OAUTH_ENCRYPTION_KEY` (veya JWT secret) tanımlı olmalı — token şifreleme için.

Prod DB: `scripts/sql/social-hub-oauth-states.sql` içindeki `pkce_verifier` kolonu uygulanmış olmalı (TypeORM synchronize veya manuel `ALTER`).

## 3. Panel

**Hesap → Sosyal medya → Bağlantılar → Yol haritası → X bağla**

Başarılı bağlantıda durum **CONNECTED**, görünen ad `@lertalogistics`, profil `https://x.com/lertalogistics`.

## 4. Sonraki faz (DM / Mesajlar)

- `dm.read` / `dm.write` ve Account Activity webhook
- X API **Basic/Pro** abonelik ve uygulama onayı
- Kodda `socialHubXDmCapability` kapısı kaldırılınca webhook ingest eklenecek
