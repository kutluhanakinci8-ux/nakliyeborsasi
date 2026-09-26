# isimtescil — Lerta Mail SaaS (`lerta.com.tr`)

**Logistics = `lerta.tr` (ayrı).** Bu tablo yalnızca **satılacak posta programı** için.

## Uygulama

| Tür | Host | Değer |
|-----|------|--------|
| A | `posta` | `168.231.109.27` |
| A | `yonetim` | `168.231.109.27` |
| A | `kurumsal` | `168.231.109.27` |
| A | `mail` | `168.231.109.27` |
- Webmail UI: **https://posta.lerta.com.tr**
- Kurumsal vitrin (www cutover öncesi): **https://kurumsal.lerta.com.tr** (A kaydı + Let’s Encrypt — canlı)
- `www` / kök → U88 (dokunmayın)

## Platform gönderim (`notifications@mail.lerta.com.tr`)

| Tür | Host | Değer |
|-----|------|--------|
| TXT | `mail.lerta.com.tr` | `v=spf1 ip4:168.231.109.27 -all` |
| TXT | `default._domainkey.mail.lerta.com.tr` | VPS OpenDKIM çıktısı |
| TXT | `_dmarc.mail.lerta.com.tr` | `v=DMARC1; p=none; rua=mailto:dmarc@lerta.com.tr` |

## Tenant (müşteri kutuları `slug@lerta.com.tr` + gelen posta)

| Tür | Host | Değer |
|-----|------|--------|
| TXT | `lerta.com.tr` | `v=spf1 ip4:168.231.109.27 -all` |
| TXT | `default._domainkey.lerta.com.tr` | VPS tenant DKIM (`setup-mail-lerta-com-tr-pilot.sh`) |
| TXT | `_dmarc.lerta.com.tr` | `v=DMARC1; p=none; rua=mailto:dmarc@lerta.com.tr` |
| **MX** | `lerta.com.tr` | **`10 mail.lerta.com.tr`** |

Eski pilot `kullanici.lerta.com.tr` kayıtları kaldırılabilir.

## Lerta Post — sıfır müşteri DNS (`info@firma.post`)

Müşteri DNS yapmaz. Satış yüzü: **`info@abayer.post`** (ön ek: info, satis, …). Teknik FQDN: `abayer.post.lerta.com.tr`.

| Tür | Host | Değer |
|-----|------|--------|
| **MX** | `*.post.lerta.com.tr` (wildcard) | `10 mail.lerta.com.tr` |
| TXT | `post.lerta.com.tr` | `v=spf1 ip4:168.231.109.27 -all` |
| TXT | `default._domainkey.firma.post.lerta.com.tr` | Kutu açılışında API üretir (OpenDKIM) |

PTR (Hostinger, IP): `mail.lerta.com.tr`

## VPS kurulum

```bash
cd /var/www/nakliyeborsasi
bash scripts/enable-mail-pilot-lerta-com-tr-env.sh
bash scripts/setup-mail-lerta-com-tr-pilot.sh   # DKIM TXT ekrana yazılır
bash scripts/nginx-posta-lerta-com-tr.sh
bash scripts/restart-mail-web.sh
bash scripts/restart-api.sh
```

Panel (platform admin hâlâ logistics web’de olabilir); müşteri kutusu: **posta.lerta.com.tr/login**

Test kullanıcısı: kurumsal posta kimliği olan firma hesabı (ör. pilot org).
