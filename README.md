# Nakliye Borsası

> **Önemli:** `npm install`, `npm run build`, `npm run start` komutlarını **mutlaka repo kökünde** çalıştırın (`package.json` burada olmalı).  
> Mac `~` veya VPS `/root` dizininde çalıştırırsanız `ENOENT` / `Missing script: build` alırsınız.  
> Sunucu kurulumu: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

Modüler yük borsası platformu — TR ve UA–EU koridoru, çoklu dil (`tr`, `en`, `uk`, `ru`), modüler abonelik ve harici kaynak entegrasyonları.

## Yapı

| Paket | Açıklama |
|-------|----------|
| `core/` | Domain tipleri, exception’lar, port arayüzleri |
| `apps/api/` | NestJS HTTP API (PostgreSQL, Redis, JWT) |
| `apps/web/` | Next.js panel iskeleti |
| `apps/mobile/` | Expo React Native iskeleti |

## E-posta ve bildirim platformu (Lerta)

**Önemli:** Platformun **yazılımı ve taşıma hattı bizim** — kuyruk, şablonlar, olay kataloğu, admin paneli, analitik, suppression, kullanıcı/firma tercihleri bu repoda; **giden posta yalnızca kendi VPS MTA** (Postfix + OpenDKIM). Postmark, SES, SendGrid, Gmail relay **kullanılmaz**. Kalıcı domain: `mail.lerta.tr`, From: `notifications@mail.lerta.tr`.

### Strateji: Hedef A → B → C

| Hedef | Açıklama | Durum |
|-------|----------|--------|
| **A** | Sadece **platform bildirimleri** (`notifications@mail.lerta.tr`, ihale/kayıt vb.) | Devam ediyor |
| **B** | Müşteri **gönderen kimliği** (`@musteri.com` veya `@kullanici.lerta.tr`) — hâlâ bildirim, tam webmail değil | Planlandı |
| **C** | **Tam posta kutusu** (gelen+giden, panel webmail, isteğe bağlı IMAP) | Planlandı |

Detaylı yol haritası: [docs/EMAIL_PLATFORM_STRATEGY_ABC.md](docs/EMAIL_PLATFORM_STRATEGY_ABC.md)  
Faz A DNS (isimtescil `lerta.tr`): [docs/EMAIL_PHASE_A_DNS_ISIMTESCIL.md](docs/EMAIL_PHASE_A_DNS_ISIMTESCIL.md)

### Şu ana kadar yapılanlar

**Admin ve ürün**

- `/admin/bildirimler` — **Operasyon**, **Analitik**, **Politika & ESP**, **Platform gönderim** (Faz A checklist + DNS tablosu).
- Outbox kuyruğu, retry, test gönderim, gönderim günlüğü, mesaj önizleme.
- F1 analitik: özet KPI, günlük seri, olay kırılımı, CSV export.
- F2 engagement: açılma/tıklama pixel, bounce sınıflandırma, engagement event’leri.
- F3 politika: olay kataloğu (ihale, ilan, mesaj + auth), kullanıcı/firma tercihleri, suppression CRUD.
- F4 gönderim: yalnızca **SMTP** (`SmtpEmailSender` → kendi Postfix).
- Gelen kutu: Faz C’de kendi MX + panel webmail (harici Gmail/ESP entegrasyonu yok).
- Profil sayfası bildirim tercihleri API ile senkron.

**API (özet)**

- `platform-admin/notifications/*` — outbox, health, analytics, suppressions, catalog, `platform-sending` (DNS checklist).
- `email/track/open|click`, `me/notification-preferences`.

**Deploy / ops**

- VPS deploy scriptleri: git senkron, web build doğrulama (`/admin/bildirimler` HTTP 200).
- Üretim web: `cursor/own-mail-platform-519e` dalı, PM2 `nakliyeborsasi-web` :3011.

**Dokümantasyon**

- [docs/MAIL_ADMIN_BENCHMARK_REPORT.md](docs/MAIL_ADMIN_BENCHMARK_REPORT.md) — rakip analizi  
- [docs/EMAIL_F3_F4_OPERATIONS.md](docs/EMAIL_F3_F4_OPERATIONS.md) — politika ve kendi MTA  
### Yapılacaklar (sıra)

**Faz A — bitirmek (sizin + VPS)**

1. `lerta.tr` → isimtescil DNS: SPF, DKIM, DMARC ([rehber](docs/EMAIL_PHASE_A_DNS_ISIMTESCIL.md)).
2. VPS Postfix + OpenDKIM; `SMTP_PROFILE=custom`, `SMTP_FROM=notifications@mail.lerta.tr`.
3. VPS `.env`: `MAIL_PLATFORM_*`, `MAIL_PLATFORM_SPF_IPV4`, `MAIL_PLATFORM_DKIM_TXT`.
4. Admin → **Platform gönderim** checklist + Operasyon’dan SMTP doğrula ve test maili.

**Faz B**

- `MailDomain` / `MailSenderIdentity` entity’leri, org domain doğrulama UI, outbox’ta org From.
- Pilot müşteri `@musteri.com` transactional gönderim.

**Faz C**

- Inbound MX + MIME depolama + panel webmail; isteğe bağlı IMAP/Mailcow hücresi.
- Bildirim outbox ile mailbox verisinin ayrımı.

### Ortam değişkenleri (e-posta)

`.env.example` içinde Faz A alanları (`MAIL_PLATFORM_*`, `SMTP_*`).  
Operatör: `admin@lerta.tr` · Bildirim From: `notifications@mail.lerta.tr`.

## Kurulum

```bash
git clone https://github.com/kutluhanakinci8-ux/nakliyeborsasi.git
cd nakliyeborsasi
git checkout cursor/own-mail-platform-519e

docker compose up -d
npm install
cp .env.example .env
npm run build
npm run start
```

VPS tek komut (root): `bash scripts/bootstrap-ubuntu-vps.sh`

Detaylı anlatım: `docs/DEPLOYMENT.md`

Web (opsiyonel): `npm run dev -w @nakliyeborsasi/web`

## Auth

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"emailAddress":"demo@nakliyeborsasi.local","password":"DemoPass123!"}'
```

Korumalı uçlar: `Authorization: Bearer <token>`

Demo seed hesabı: `docs/PHASES.md`

## API (özet)

- `POST /api/v1/auth/register` · `POST /api/v1/auth/login`
- `GET /api/v1/subscriptions/plans?lang=tr`
- `GET|POST /api/v1/marketplace/listings` (JWT)
- `GET /api/v1/integrations/freight-offers` (JWT + **EXTERNAL_FEEDS**)
- `GET /api/v1/auctions/status` · `messaging` · `trust-scores` (iskelet)

## Kod ilkeleri

- Dosya başına tek sınıf, satır içi yorum yok, ortak tipler `core/`

Detay: `docs/MVP_SCOPE.md`, `docs/ARCHITECTURE.md`, `docs/PHASES.md`, `docs/EMAIL_PLATFORM_STRATEGY_ABC.md`
