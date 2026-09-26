# Abayer — info@abayer.post (VPS)

Scriptler `main` dalında yoksa önce **PR #98** kodunu sunucuya alın.

## 1) Kodu çek ve derle

```bash
cd /var/www/nakliyeborsasi
git fetch origin cursor/mail-instant-box-dns-519e
git checkout cursor/mail-instant-box-dns-519e
npm ci
npm run build -w @nakliyeborsasi/core
npm run build -w @nakliyeborsasi/api
npm run build -w @lerta/mail-console
bash scripts/restart-api.sh
bash scripts/restart-mail-web.sh
```

(`yonetim.lerta.com.tr` mail-console bu build’den gelir.)

## 2) Admin JWT (gerçek token)

Placeholder kullanmayın. `admin@lerta.tr` ile yönetimde giriş yapın; tarayıcıda:

- Geliştirici araçları → Application → Local Storage → `accessToken`  
  veya bir API isteğinin `Authorization: Bearer …` başlığı.

```bash
export PLATFORM_ADMIN_JWT='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....'
```

## 3) Geçiş (Abayer)

```bash
cd /var/www/nakliyeborsasi
bash scripts/provision-abayer-lerta-post.sh
```

Script yoksa tek satır:

```bash
curl -sf -X POST "https://posta.lerta.com.tr/api/v1/platform-admin/mail/instant-post/switch-primary" \
  -H "Authorization: Bearer ${PLATFORM_ADMIN_JWT}" \
  -H "Content-Type: application/json" \
  -d '{"lookupCustomDomain":"abayer.com","orgSlug":"abayer","localPart":"info"}'
```

404 alırsanız API henüz güncel değil — adım 1’i tekrarlayın.

## 4) Müşteri self-servis (admin yoksa)

`karagoz@abayer.com` → Özet → **info@abayer.post olarak ayarla**  
veya Domain → `info@abayer.post` → Hazırla (mail-console build gerekir).

Giriş e-postası değişmez; kurumsal adres **info@abayer.post** olur.
