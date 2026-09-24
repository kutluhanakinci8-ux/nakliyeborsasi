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

1. Google hesabında **2 adımlı doğrulama** açık olmalı.
2. **Uygulama şifresi** oluştur (16 karakter).
3. VPS `.env`:

```env
SMTP_PROFILE=gmail
SMTP_USER=lertalogistics@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=Lerta Logistics <lertalogistics@gmail.com>
```

4. API restart: `bash scripts/restart-api.sh`
5. Admin → **SMTP doğrula** (Mail yönetimi sayfası).

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
