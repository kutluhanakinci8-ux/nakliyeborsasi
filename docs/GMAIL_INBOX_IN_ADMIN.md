# Gmail’i admin panelinde yönetmek

## Neden Gmail sitesi gömülmez?

Google, `mail.google.com` arayüzünü **iframe içinde açmayı güvenlik nedeniyle engeller** (X-Frame-Options). Bu yüzden “programın içinde tam Gmail” ancak **Gmail API** ile kendi okuma panelimizi yapmakla mümkün.

## Bizim çözüm

| Katman | Ne yapar |
|--------|----------|
| **SMTP** (mevcut) | Platformdan e-posta **gönderir** (kayıt, giriş, şablonlar) |
| **Outbox** (mevcut) | Gönderilen transactional kayıtlar |
| **Gmail API** (yeni) | `lertalogistics@gmail.com` **gelen kutusunu** admin panelde listeler |
| **Gmail’de aç** | Tek tıkla tam Gmail web (yeni sekme) |

## Google Cloud kurulumu (bir kez)

1. https://console.cloud.google.com → proje oluşturun.
2. **API’ler ve Hizmetler → Kitaplık** → **Gmail API** → Etkinleştir.
3. **OAuth consent screen** → External / test kullanıcılarına `lertalogistics@gmail.com` ekleyin.
4. **Credentials → OAuth client ID → Web application**:
   - Authorized redirect URI:
     `https://168.231.109.27/api/v1/platform-admin/gmail/oauth/callback`
5. Client ID ve Client Secret’ı VPS `.env` dosyasına yazın.

```env
GOOGLE_GMAIL_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_GMAIL_CLIENT_SECRET=GOCSPX-...
GOOGLE_GMAIL_OAUTH_REDIRECT_URI=https://168.231.109.27/api/v1/platform-admin/gmail/oauth/callback
```

## Panelde bağlama

1. **Admin → Mail yönetimi → Gmail gelen kutusu**
2. **Gmail hesabını bağla** → Google izin ekranı → onay
3. Gelen kutusu listesi panelde görünür; tam yanıt için **Gmail’de aç** kullanın.

İsteğe bağlı: OAuth sonrası refresh token’ı `.env` içine `GMAIL_OAUTH_REFRESH_TOKEN=` olarak da kopyalayabilirsiniz (yedek).
