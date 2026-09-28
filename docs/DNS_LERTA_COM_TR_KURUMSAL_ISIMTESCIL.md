# Lerta Kurumsal Posta — isimtescil DNS rehberi (`lerta.com.tr`)

Bu belge, **kurumsal posta modeli** (`kutluhanlogistics@lerta.com.tr`, `info@lerta.com.tr`, …) için isimtescil.net üzerinde tanımlanacak tüm DNS kayıtlarını tek listede toplar.

| Sabit | Değer |
|--------|--------|
| VPS (mail sunucu) IP | `168.231.109.27` |
| MTA host adı | `mail.lerta.com.tr` |
| Paylaşımlı tenant alanı | `lerta.com.tr` (tüm müşteri kutuları `*@lerta.com.tr`) |
| Webmail | `https://posta.lerta.com.tr` |

**Ayrı ürün:** Nakliye borsası / logistics alanı **`lerta.tr`** — bu tabloda yok; karıştırmayın.

**Dokunmayın:** `www.lerta.com.tr` ve kök site yönlendirmeleri (U88 / mevcut vitrin). Aşağıdaki kayıtlar posta ve Lerta uygulama alt alanları içindir.

---

## 1. Zorunlu — dışarıdan **gelen** posta (`*@lerta.com.tr`)

Gmail, Outlook, MSN vb. önce **MX** kaydına bakar. MX yoksa posta sunucuya **ulaşmaz** (giden posta yine çalışabilir).

| # | Tür | isimtescil host alanı | Değer | Açıklama |
|---|-----|------------------------|--------|----------|
| 1.1 | **MX** | `@` (kök / `lerta.com.tr`) | Öncelik **10** → `mail.lerta.com.tr` | Tüm `*@lerta.com.tr` gelen posta |
| 1.2 | **A** | `mail` | `168.231.109.27` | MX’in işaret ettiği sunucu (çoğu kurulumda zaten var) |

**Doğrulama:**

```bash
dig +short MX lerta.com.tr
# Beklenen: 10 mail.lerta.com.tr.

dig +short A mail.lerta.com.tr
# Beklenen: 168.231.109.27
```

---

## 2. Zorunlu — kurumsal **uygulama** (webmail ve API)

| # | Tür | Host | Değer | Açıklama |
|---|-----|------|--------|----------|
| 2.1 | **A** | `posta` | `168.231.109.27` | Webmail UI (`posta.lerta.com.tr`) |
| 2.2 | **A** | `mail` | `168.231.109.27` | SMTP/IMAP host (1.2 ile aynı kayıt) |

İsteğe bağlı vitrin / yönetim (ürün açıksa):

| # | Tür | Host | Değer |
|---|-----|------|--------|
| 2.3 | A | `kurumsal` | `168.231.109.27` |
| 2.4 | A | `yonetim` | `168.231.109.27` |

VPS tarafında Let’s Encrypt / nginx bu hostlar için ayrıca yapılandırılır (DNS dışı).

---

## 3. Zorunlu — **güvenilir giden** posta (`@lerta.com.tr` kutuları)

Alıcılar (özellikle Microsoft) SPF/DKIM olmadan postayı spam’e atar veya reddeder. Kurumsal üretim için üçlü set önerilir; **SPF + DKIM** pratikte zorunlu kabul edin.

| # | Tür | Host | Değer |
|---|-----|------|--------|
| 3.1 | **TXT** (SPF) | `@` (kök) | `v=spf1 ip4:168.231.109.27 -all` |
| 3.2 | **TXT** (DKIM) | `default._domainkey` | VPS OpenDKIM çıktısı (aşağıda) |
| 3.3 | **TXT** (DMARC) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@lerta.com.tr; pct=100` |

**DKIM TXT nasıl alınır (VPS):**

```bash
cd /var/www/nakliyeborsasi
bash scripts/setup-mail-lerta-com-tr-pilot.sh
# veya mevcut anahtar:
cat /etc/opendkim/keys/lerta.com.tr/default.txt
```

isimtescil’de host: `default._domainkey` → panelde tam ad genelde `default._domainkey.lerta.com.tr`. TXT değeri tek satır `v=DKIM1; k=rsa; p=...` (tırnakları panel talimatına göre).

**Doğrulama:**

```bash
bash scripts/verify-mail-dns-lerta.sh
```

---

## 4. Zorunlu — platform **sistem** postası (`notifications@mail.lerta.com.tr`)

Bildirimler, şifre sıfırlama vb. sistem e-postaları bu alt alandan çıkar.

| # | Tür | Host | Değer |
|---|-----|------|--------|
| 4.1 | **A** | `mail` | `168.231.109.27` (bkz. 1.2) |
| 4.2 | **TXT** (SPF) | `mail` | `v=spf1 ip4:168.231.109.27 -all` |
| 4.3 | **TXT** (DKIM) | `default._domainkey.mail` | VPS: `/etc/opendkim/keys/mail.lerta.com.tr/default.txt` |
| 4.4 | **TXT** (DMARC) | `_dmarc.mail` | `v=DMARC1; p=none; rua=mailto:dmarc@lerta.com.tr` |

---

## 5. Hostinger (DNS değil — **PTR / rDNS**)

isimtescil’de yapılmaz; VPS sağlayıcı paneli (Hostinger).

| # | Nerede | Kayıt | Değer |
|---|--------|--------|--------|
| 5.1 | Hostinger → IP `168.231.109.27` | PTR (ters DNS) | `mail.lerta.com.tr` |

Outlook teslimatı ve itibar için şiddetle önerilir. Mevcut PTR `srv1828484.hstgr.cloud` ise Hostinger destekten güncelleme isteyin.

---

## 6. İsteğe bağlı — eski / paralel ürünler

Yalnızca **`@lerta.com.tr`** kullanıyorsanız **6.2 ve 6.3’ü atlayabilirsiniz**. Geçiş veya eski kutular açıksa bırakın.

### 6.1 Temizlik (önerilir)

| Eski kayıt | Not |
|------------|-----|
| `kullanici.lerta.com.tr` MX/TXT | Pilot; yeni model `@lerta.com.tr` |
| `kullanici.lerta.tr` | Logistics ayrı zone — mail SaaS ile karıştırmayın |

### 6.2 Lerta Post (`@firma.post`) — isteğe bağlı / legacy

Müşteri DNS yapmaz; platform `post.lerta.com.tr` bölgesini yayınlar.

| Tür | Host | Değer |
|-----|------|--------|
| MX | `*.post` (wildcard) | `10 mail.lerta.com.tr` |
| TXT | `post` | `v=spf1 ip4:168.231.109.27 -all` |
| TXT | `_dmarc.post` | `v=DMARC1; p=none; rua=mailto:dmarc@lerta.com.tr; adkim=r; aspf=r` |

Detay: `bash scripts/print-instant-post-dns-isimtescil.sh` · Doğrulama: `bash scripts/verify-lerta-post-dns.sh`

### 6.3 Özel domain (B2B paket)

Müşteri `info@kendi-firma.com` kullanır — kayıtlar **müşteri zone’unda**; panelden «özel domain» akışı. Platform genel listesine dahil değil.

---

## 7. İsteğe bağlı — güvenlik ve raporlama (ileri seviye)

| # | Tür | Host | Değer | Ne zaman |
|---|-----|------|--------|----------|
| 7.1 | TXT | `_dmarc` | `p=quarantine` veya `p=reject` (önce `p=none` ile rapor toplayın) | DMARC olgunlaştıktan sonra |
| 7.2 | TXT | `_dmarc` | `rua=mailto:dmarc@lerta.com.tr;ruf=mailto:dmarc@lerta.com.tr` | Forensic rapor istenirse |
| 7.3 | CAA | `@` | Let’s Encrypt için CA kısıtı | Güvenlik politikası varsa |

---

## 8. Özet kontrol listesi (operatör)

| Adım | Kontrol | Komut / beklenen |
|------|---------|------------------|
| A | Gelen posta | `dig +short MX lerta.com.tr` → `10 mail.lerta.com.tr.` |
| B | MTA | `dig +short A mail.lerta.com.tr` → `168.231.109.27` |
| C | Webmail | `dig +short A posta.lerta.com.tr` → `168.231.109.27` |
| D | Tenant SPF | `dig +short TXT lerta.com.tr` → `v=spf1 ip4:168.231.109.27` |
| E | Tenant DKIM | `dig +short TXT default._domainkey.lerta.com.tr` → `v=DKIM1` |
| F | VPS Postfix | `bash scripts/vps-diagnose-inbound-remote.sh` |
| G | PTR | `dig +short -x 168.231.109.27` → `mail.lerta.com.tr` (ideal) |

Kopyala-yapıştır çıktı: `bash scripts/print-lerta-com-tr-kurumsal-dns-isimtescil.sh`

---

## 9. Müşteri ne yapar?

**Hiçbir DNS yapılmaz.** Müşteri yalnızca `önek@lerta.com.tr` seçer (kayıt sihirbazı veya organizasyon ayarı). Tüm tablo **tek sefer platform (isimtescil) işidir**.
