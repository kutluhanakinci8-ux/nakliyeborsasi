# Sunucu ve yerel kurulum

`npm install` / `npm run build` yalnızca **proje kök dizininde** (`package.json` olan klasör) çalışır.  
`~` (Mac home) veya VPS `/root` içinde **package.json yoktur** — bu yüzden `ENOENT` hatası alırsınız.

---

## 1) VPS (Ubuntu) — önerilen akış

SSH ile bağlandıktan sonra:

```bash
apt update && apt install -y git curl ca-certificates

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

apt install -y postgresql postgresql-contrib redis-server

mkdir -p /var/www && cd /var/www
git clone https://github.com/kutluhanakinci8-ux/nakliyeborsasi.git
cd nakliyeborsasi
git checkout cursor/modular-freight-platform-18ba

sudo -u postgres psql -c "CREATE USER nakliyeborsasi WITH PASSWORD 'nakliyeborsasi';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE nakliyeborsasi OWNER nakliyeborsasi;" 2>/dev/null || true
sudo -u postgres psql -d nakliyeborsasi -c "GRANT ALL ON SCHEMA public TO nakliyeborsasi;"

cp .env.example .env
sed -i 's/JWT_SECRET=change-me/JWT_SECRET='"$(openssl rand -hex 32)"'/' .env

npm install
npm run build
npm run start
```

API: `http://SUNUCU_IP:3000/api/v1/health`

Kalıcı çalıştırma için PM2 (opsiyonel):

```bash
npm install -g pm2
cd /var/www/nakliyeborsasi
pm2 start npm --name nakliyeborsasi-api -- run start
pm2 save && pm2 startup
```

Firewall:

```bash
ufw allow 22
ufw allow 3000
ufw enable
```

---

## 2) Mac (yerel geliştirme)

Önce repoyu klonlayın (home dizininde değil):

```bash
cd ~/Projects
git clone https://github.com/kutluhanakinci8-ux/nakliyeborsasi.git
cd nakliyeborsasi
git checkout cursor/modular-freight-platform-18ba
```

Docker yoksa Postgres + Redis:

```bash
brew install node@20 postgresql@16 redis
brew services start postgresql@16
brew services start redis
```

Mac’te veritabanı oluşturma (psql):

```bash
createuser -s nakliyeborsasi 2>/dev/null || true
createdb -O nakliyeborsasi nakliyeborsasi 2>/dev/null || true
```

Proje kökünde:

```bash
cp .env.example .env
npm install
npm run build
npm run start
```

---

## 3) Demo login testi

Sunucu veya Mac’te API ayaktayken (**tek satır**, `<token>` yazmayın):

```bash
curl -s -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"emailAddress":"demo@nakliyeborsasi.local","password":"DemoPass123!"}'
```

Dönen `accessToken` değerini kopyalayın:

```bash
export TOKEN="buraya_yapıştırın"

curl -s -H "Authorization: Bearer $TOKEN" \
  'http://127.0.0.1:3000/api/v1/marketplace/listings?lang=tr'
```

Terminalde `#` ile başlayan satırları yapıştırmayın (zsh yorum satırı hatası verir).

---

## 4) Sık hatalar

| Hata | Sebep | Çözüm |
|------|--------|--------|
| `ENOENT ... /root/package.json` | VPS’te `/root` içinde npm | `cd /var/www/nakliyeborsasi` |
| `Missing script: "build"` | Mac’te `~` içinde npm | Proje klasörüne `cd` |
| `Connection refused :3000` | API çalışmıyor | `npm run start` + `.env` |
| `cp: .env.example` yok | Yanlış dizin | `ls package.json` ile doğrulayın |
| `JWT_SECRET is required` | `.env` yok / okunmuyor | `cp .env.example .env` proje kökünde |

---

## 5) Ortam değişkenleri (.env)

| Değişken | Açıklama |
|----------|----------|
| `DATABASE_URL` | Postgres bağlantı URI |
| `REDIS_URL` | Redis (cache + rate limit) |
| `JWT_SECRET` | Üretimde güçlü rastgele değer |
| `PORT` | Varsayılan `3000` |
