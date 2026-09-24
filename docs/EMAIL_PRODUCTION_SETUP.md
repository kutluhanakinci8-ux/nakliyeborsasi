# E-posta altyapısı — çalıştırma rehberi

## Modlar

| `SMTP_PROFILE` | Amaç | Varsayılan host |
|----------------|------|-----------------|
| `mailpit` | Sunucuda test; Gmail kutusuna gitmez | `127.0.0.1:1025` |
| `gmail` | **lertalogistics@gmail.com** ile gerçek gönderim | `smtp.gmail.com:587` |
| `custom` | Resend, SES, kurumsal SMTP | `.env` ile |

## 1. Mailpit (VPS — şu an aktif)

```bash
docker compose -f docker-compose.mailpit.yml up -d
```

`.env`:

```env
EMAIL_ENABLED=true
SMTP_PROFILE=mailpit
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_FROM=Lerta Logistics <lertalogistics@gmail.com>
PLATFORM_ADMIN_EMAILS=lertalogistics@gmail.com
WEB_PUBLIC_BASE_URL=https://168.231.109.27
```

Mailpit UI (sunucuda): SSH tüneli `ssh -L 8025:127.0.0.1:8025 root@168.231.109.27` → http://localhost:8025

Admin panel: **Mail yönetimi** → Test gönder → outbox **sent**.

## 2. Gmail (gerçek kutu)

### A) Google tarafı (bir kez)

1. https://myaccount.google.com/security → **2 Adımlı Doğrulama** → Açık.
2. Aynı sayfada **Uygulama şifreleri** (App passwords).
3. Uygulama: **Mail**, Cihaz: **Diğer** → ad: `Lerta VPS`.
4. Google **16 karakterlik şifre** verir (ör. `abcd efgh ijkl mnop`). Bunu kopyalayın.

### B) VPS `.env` — iki yöntem

**Yöntem 1 — Otomatik script (önerilen)**

Sunucuya SSH ile bağlanın:

```bash
ssh root@168.231.109.27
cd /var/www/nakliyeborsasi
git pull origin cursor/email-production-0825   # script yoksa önce deploy
read -s SMTP_PASS && export SMTP_PASS && bash scripts/vps-email-gmail-env.sh
```

`read -s` şifreyi ekrana yazmaz; Enter’dan sonra script `.env`’i günceller ve API’yi yeniden başlatır.

**Yöntem 2 — Elle `nano`**

```bash
ssh root@168.231.109.27
nano /var/www/nakliyeborsasi/.env
```

Şu satırları ekleyin veya değiştirin (`SMTP_PASS` = Google uygulama şifresi, boşluksuz da olur):

```env
EMAIL_ENABLED=true
SMTP_PROFILE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=lertalogistics@gmail.com
SMTP_PASS="abcdefghijklmnop"
SMTP_FROM=Lerta Logistics <lertalogistics@gmail.com>
PLATFORM_ADMIN_EMAILS=lertalogistics@gmail.com
WEB_PUBLIC_BASE_URL=https://168.231.109.27
```

Kaydet: `Ctrl+O`, Enter, çık: `Ctrl+X`.

```bash
cd /var/www/nakliyeborsasi && bash scripts/restart-api.sh
```

### C) Doğrulama

1. https://168.231.109.27/admin/bildirimler → **SMTP durumu** artık `gmail (smtp.gmail.com:587)` göstermeli.
2. **SMTP doğrula** → «başarılı».
3. **Test gönder** → `lertalogistics@gmail.com` → Gmail **Gelen kutusu** (Mailpit değil).

Geri test moduna dönmek için: `SMTP_PROFILE=mailpit`, `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_PASS` satırını silin veya boşaltın, API restart.

## 3. Otomatik işleme

- Her kayıt / giriş olayı `email_outbox` tablosuna yazılır.
- `EmailOutboxProcessor` 30 sn'de bir pending/failed kayıtları dener.
- Admin: **Kuyruğu işle** / **Başarısızları yeniden dene**.

## 4. Olaylar (varsayılan)

| Olay | Admin mail | Kullanıcı mail |
|------|------------|----------------|
| USER_REGISTERED | Açık | Hoş geldin |
| USER_LOGIN | Açık | Kapalı |
| EMAIL_VERIFICATION | Açık | Doğrulama linki |
| PASSWORD_RESET | Açık | Sıfırlama linki |

Alıcı listesi: `PLATFORM_ADMIN_EMAILS` veya admin UI’daki virgüllü liste.
