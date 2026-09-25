# isimtescil — `lerta.com.tr` DNS (pilot)

**Kök site (U88):** `lerta.com.tr` / `www` mevcut A kaydı kalır — **değiştirmeyin** (502 U88 API ise ayrı konu).

**Bu program (Nakliye Borsası):** `app.lerta.com.tr`

Panel: **Alan Adı Yönetimi → lerta.com.tr → DNS Yönetimi** (IP Bazlı DNS).

## 1. Uygulama (Faz 0 — hemen)

| Tür | Host / ad | Değer |
|-----|-----------|--------|
| **A** | `app` veya `app.lerta.com.tr` | `168.231.109.27` |

Doğrulama: `dig +short A app.lerta.com.tr` → `168.231.109.27`

VPS (root):

```bash
cd /var/www/nakliyeborsasi
bash scripts/nginx-app-lerta-com-tr.sh
bash scripts/enable-mail-pilot-lerta-com-tr-env.sh
bash scripts/restart-api.sh
bash scripts/restart-web.sh /var/www/nakliyeborsasi 3011 https://app.lerta.com.tr/api/v1
```

Tarayıcı: `https://app.lerta.com.tr/login` · `https://app.lerta.com.tr/admin/bildirimler`

## 2. Mail — platform gönderim (Faz 1)

| Tür | Host | Değer |
|-----|------|--------|
| A | `mail` | `168.231.109.27` |
| TXT | `mail.lerta.com.tr` | `v=spf1 ip4:168.231.109.27 -all` |
| TXT | `default._domainkey.mail.lerta.com.tr` | VPS `setup-mail-lerta-com-tr-pilot.sh` çıktısı |
| TXT | `_dmarc.mail.lerta.com.tr` | `v=DMARC1; p=none; rua=mailto:dmarc@lerta.com.tr` |

Hostinger **PTR** (aynı IP): `mail.lerta.com.tr`

## 3. Mail — kurumsal tenant (gelen + From)

| Tür | Host | Değer |
|-----|------|--------|
| TXT | `kullanici.lerta.com.tr` | `v=spf1 ip4:168.231.109.27 -all` |
| TXT | `default._domainkey.kullanici.lerta.com.tr` | OpenDKIM tenant çıktısı |
| TXT | `_dmarc.kullanici.lerta.com.tr` | `v=DMARC1; p=none; rua=mailto:dmarc@lerta.com.tr` |
| **MX** | `kullanici.lerta.com.tr` | `10 mail.lerta.com.tr` |

VPS:

```bash
bash scripts/setup-mail-lerta-com-tr-pilot.sh
bash scripts/apply-mail-vps-inbound-stack.sh   # zaten kuruluysa atlanabilir
```

Admin → **Kurumsal kimlik (B)** → DNS doğrula → org provision.

## 4. Kontrol

```bash
bash scripts/verify-mail-dns-lerta.sh
# MAIL_PLATFORM_TENANT_DOMAIN=kullanici.lerta.com.tr ile tenant bölümü
```
