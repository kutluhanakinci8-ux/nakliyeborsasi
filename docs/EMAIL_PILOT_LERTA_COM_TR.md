# Pilot: `lerta.com.tr` üzerinde yayın ve mail geliştirme

**Domain kuralı:** **Lerta Logistics = `lerta.tr`** · **Mail programı (SaaS) = `lerta.com.tr`** — iki ayrı domain, ortak kod/MTA. Detay: [EMAIL_PRODUCT_LERTA_MAIL_SAAS.md](./EMAIL_PRODUCT_LERTA_MAIL_SAAS.md).

**Durum (2026-09):** `www.lerta.com.tr` U88. Mail ürünü: `mail` / `kullanici` / (ileride `posta`) alt alanları. Logistics üretim **`lerta.tr`**; `app.lerta.com.tr` yalnızca geçici test olabilir.

---

## Temel ayrım

| Katman | `lerta.com.tr` (pilot) | `lerta.tr` (sonra) |
|--------|-------------------------|---------------------|
| Kurumsal web sitesi | Mevcut program kalabilir (`www` / kök A) | Mevcut site |
| **Bu program (Next.js)** | Örn. `app.lerta.com.tr` → VPS :3011 | Örn. `app.lerta.tr` veya mevcut URL |
| Platform bildirim MTA | `mail.lerta.com.tr` | `mail.lerta.tr` |
| Org gönderen / gelen | `kullanici.lerta.com.tr` | `kullanici.lerta.tr` |
| Admin operatör | `admin@lerta.com.tr` (pilot) veya mevcut `admin@lerta.tr` | Üretim kararı |

Mail ve uygulama **kök domain’i ele geçirmez**; sadece DNS’e yeni kayıtlar eklenir.

---

## Faz 0 — Yayın hedefi (bu programı göstermek)

**Amaç:** Kullanıcılar IP:3011 yerine markalı URL ile giriş yapsın; admin paneli (ekran görüntüsündeki **E-posta ve operasyon merkezi**) bu URL’den erişilebilir olsun.

| # | İş | Sorumlu | Not |
|---|-----|---------|-----|
| 0.1 | DNS **A** `app.lerta.com.tr` → `168.231.109.27` | Domain paneli | Kök siteye dokunulmaz |
| 0.2 | VPS **nginx** reverse proxy → `127.0.0.1:3011` | Sunucu | `scripts/nginx-nakliyeborsasi-https-selfsigned.sh` veya Let’s Encrypt |
| 0.3 | `.env` `WEB_PUBLIC_BASE_URL=https://app.lerta.com.tr` | VPS | E-posta linkleri doğru domain |
| 0.4 | CORS / cookie (gerekirse) | Kod | API aynı VPS’te kalabilir |
| 0.5 | Smoke: `/login`, `/admin/bildirimler`, `/hesap/organizasyon` | QA | Mevcut program `www` üzerinde çalışmaya devam eder |

**Başarı:** “Bu program” `https://app.lerta.com.tr` adresinde yayında; `lerta.com.tr` kökündeki diğer yazılım etkilenmez.

---

## Faz 1 — Mail altyapısını `lerta.com.tr` DNS’inde tanımla (kod hazır, domain değişir)

**Amaç:** Çalışmayan / eksik `lerta.tr` DNS’ine takılmadan tam MTA + inbound testi.

| # | İş | DNS / VPS |
|---|-----|-----------|
| 1.1 | A `mail.lerta.com.tr` → VPS IP | Gönderim hostname + PTR hedefi |
| 1.2 | TXT SPF `mail.lerta.com.tr` | `v=spf1 ip4:168.231.109.27 -all` |
| 1.3 | OpenDKIM + TXT `default._domainkey.mail.lerta.com.tr` | `setup-postfix-phase-a-lerta.sh` uyarlanmış veya env ile host |
| 1.4 | TXT `_dmarc.mail.lerta.com.tr` | `p=none` pilot |
| 1.5 | Tenant: TXT + DKIM `kullanici.lerta.com.tr` | Org From + inbound domain |
| 1.6 | MX `kullanici.lerta.com.tr` → `10 mail.lerta.com.tr` | Gerçek gelen posta |
| 1.7 | Hostinger **PTR** → `mail.lerta.com.tr` | Junk azaltma |
| 1.8 | VPS `.env` pilot anahtarları | `MAIL_PLATFORM_DOMAIN`, `MAIL_PLATFORM_TENANT_DOMAIN`, `SMTP_FROM`, tenant DKIM |

**Kod tarafı (tek seferlik refaktör):** Sabit `kullanici.lerta.tr` yerine ortam değişkeni + `core` sabitleri pilot için `lerta.com.tr` (veya `MAIL_PILOT_MODE=com.tr`). Seed / admin metinleri env’den okunur.

**Başarı:** Admin → Platform gönderim checklist **10/10**; dışarıdan mail `slug@kullanici.lerta.com.tr` gelir.

---

## Faz 2 — Ön yüz: tam posta kutusu deneyimi (pilot domain’de)

**Amaç:** API’ler (C1–C4) var; ürün tarafında “çalışmıyor” hissi → **dedicated e-posta alanı** ile giderilir. Geliştirme `app.lerta.com.tr` üzerinde.

| # | Özellik | Nerede |
|---|---------|--------|
| 2.1 | Sol menü **E-posta** (Gelen / Gönderilen / Taslak) | `hesap` layout |
| 2.2 | Liste + okundu + spam klasörü | `OrganizationMailInboxPanel` genişletme |
| 2.3 | Okuma görünümü (HTML güvenli render) | Mevcut `bodyHtml` |
| 2.4 | Yaz / Yanıt / Ek | Compose API |
| 2.5 | Kimlik bandı: `you@kullanici.lerta.com.tr` | Mail identity panel ile birleşik UX |
| 2.6 | IMAP bilgisi + şifre yenile (Thunderbird) | Mevcut rotate + settings |
| 2.7 | Boş / hata / yükleme durumları | Pilot’ta gerçek veri |

**Başarı:** Pilot org, tarayıcıdan günlük mail kullanır; admin gelen (C1) ile uyumlu.

---

## Faz 3 — Operasyon ve stabilite (hâlâ com.tr)

| # | İş |
|---|-----|
| 3.1 | Postfix virtual otomatik senkron (mevcut bootstrap) doğrulama |
| 3.2 | Rspamd + Dovecot (stack script) com.tr domain’leri ile |
| 3.3 | MSN/Gmail/Outlook teslim testi |
| 3.4 | B6 denetim + gönderim logları görünür akışlar |
| 3.5 | Runbook: `verify-mail-dns-lerta.sh` → `verify-mail-dns-com-tr.sh` |

---

## Faz 4 — `lerta.tr` entegrasyonu (kopyala, birleştir)

Pilot çalışınca aynı VPS veya aynı kod tabanı ile:

1. DNS kayıtlarını `lerta.tr` için tekrarla (mevcut dokümanlar).
2. `.env` üretim profili: `lerta.tr` tenant + `lerta.com.tr` pilot yan yana veya tek profile geçiş.
3. Çift gönderim domain’i: org’lar `kullanici.lerta.com.tr` → isteğe `kullanici.lerta.tr` taşıma scripti (DB `mail_domains.domain`).

**Avantaj:** com.tr’de kırılan UI/DNS, tr canlı müşteriyi riske atmaz.

---

## Şu an “çalışmıyor” dediğimiz şeyler — pilot ile ilişki

| Sorun | Neden | com.tr pilot çözümü |
|--------|--------|---------------------|
| Gelen mail yok | `lerta.tr` MX yok | MX com.tr tenant |
| Junk / itibar | PTR `lerta.tr` yok | PTR `mail.lerta.com.tr` |
| Kutu “boş” hissi | UI Organizasyon sekmesinde gömülü, az veri | Faz 2 dedicated mail UI |
| IP ile gezinme | `WEB_PUBLIC_BASE_URL` IP | Faz 0 `app.lerta.com.tr` |
| İki program karışıklığı | Aynı kök domain | Alt alan: sadece `app.*` bu repo |

---

## Önerilen DNS özeti (kök siteye dokunmadan)

```
app.lerta.com.tr          A    168.231.109.27
mail.lerta.com.tr         A    168.231.109.27
kullanici.lerta.com.tr    A    168.231.109.27   (veya sadece MX+TXT, A şart değil)
kullanici.lerta.com.tr    MX   10 mail.lerta.com.tr
```

Kök `lerta.com.tr` / `www` → **mevcut programa** aynen kalır.

---

## Sıradaki teknik iş (repo)

1. `docs/EMAIL_PILOT_LERTA_COM_TR.md` (bu dosya) — plan onayı  
2. Faz 0: nginx + `app.lerta.com.tr` deploy runbook  
3. Faz 1: env-driven domain + `setup-*` script kopyaları `mail.lerta.com.tr`  
4. Faz 2: `hesap/e-posta` route + mailbox UI sprint  

Branch: `cursor/own-mail-platform-519e` (veya `cursor/lerta-com-tr-pilot-519e`).
