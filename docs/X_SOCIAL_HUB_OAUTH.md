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

## 4. Tweet yayını (VPS bayrakları)

```bash
SOCIAL_X_PUBLISH_ENABLED=1
pm2 restart nakliyeborsasi-api --update-env
```

Panel → **Yayınlar** → kanallarda **X** (bağlı + bayrak açık) → metin tweet (görsel henüz yok).

OAuth scope: `tweet.read tweet.write` (varsayılan `SOCIAL_X_OAUTH_SCOPES` içinde).

## 5. DM webhook + giden mesaj

**Webhook URL (CRC + events):**

`https://app.lerta.com.tr/api/v1/company/social-hub/webhooks/x`

X Developer → **Toolbox → Webhooks** → bu URL, **Account Activity** / DM olayları, kullanıcı **@lertalogistics** (`for_user_id` = bağlantıdaki `externalAccountId`).

VPS:

```bash
SOCIAL_X_WEBHOOK_BRIDGE_ENABLED=1   # varsayılan: 0 değilse açık
SOCIAL_X_OUTBOUND_ENABLED=1
# Opsiyonel CRC secret (yoksa Client Secret kullanılır)
# SOCIAL_X_WEBHOOK_CRC_SECRET=
```

OAuth’u **yeniden bağlayın** (`dm.read dm.write` scope — varsayılan scopes güncellendi).

Gelen DM → Mesajlar; yanıt → X DM API.

## 6. X API planı

Yoğun kullanım ve bazı DM özellikleri için X **Pay per use / Pro** kredisi gerekebilir; geliştirme modunda kendi hesabınızla test edin.
