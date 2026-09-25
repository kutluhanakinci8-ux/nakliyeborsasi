# SPF / DKIM rotasyon runbook (E6) — Lerta Mail operatör

**Amaç:** Gönderim IP’si, DKIM anahtarı veya SPF metni değiştiğinde teslimatı bozmadan güvenli geçiş.  
**Hedef VPS (örnek):** `168.231.109.27` — `MAIL_PLATFORM_SPF_IPV4` ile senkron tutun.

İlgili dokümanlar: [DNS_LERTA_COM_TR_ISIMTESCIL.md](./DNS_LERTA_COM_TR_ISIMTESCIL.md), [MAIL_DMARC_RUA_INGEST.md](./MAIL_DMARC_RUA_INGEST.md), [EMAIL_FAZ_A_PRODUCTION.md](./EMAIL_FAZ_A_PRODUCTION.md).

---

## 1. Kapsam

| Katman | Domain örneği | DKIM selector (varsayılan) | SPF kaynağı |
|--------|----------------|----------------------------|-------------|
| Platform gönderim | `mail.lerta.tr` / `mail.lerta.com.tr` | `default._domainkey.mail…` | TXT `@` veya alt host |
| Tenant alt alan | `kullanici.lerta.com.tr` | `default._domainkey.kullanici…` | Tenant TXT |
| Müşteri özel domain | `musteri.com.tr` | `default._domainkey.musteri…` | Müşteri DNS (konsol sihirbazı) |

API tarafında özel domain anahtarı `mail_domains.dns_snapshot` içinde (`dkimPrivateKeyPem`, `dkimTxt`, `spfValue`). VPS’te `MAIL_SYNC_OPENDKIM=true` ise kayıt/verify sırasında `MailCustomDomainOpenDkimInstaller` `/etc/opendkim` tablolarını günceller.

---

## 2. Ne zaman rotasyon?

- DKIM private key sızdı veya şüpheli erişim
- Planlı anahtar yenileme (ör. 12 ay)
- **Gönderim IPv4 değişti** (VPS taşıma, yeni egress IP)
- Selector değişikliği (`default` → `s202609` gibi)
- Müşteri DNS’te yanlış/eski TXT’nin temizlenmesi

**Rotasyon yapmayın** taşıma penceresinde DMARC `p=reject` + tek selector ile — önce `p=none` veya dual-publish.

---

## 3. Ön kontrol listesi

1. [ ] Son 7 gün DMARC konsol (`/dmarc`) — DKIM/SPF fail oranı tabanı
2. [ ] `bash scripts/verify-mail-dns-lerta.sh` (platform + tenant)
3. [ ] `mailq` / outbox drain boş veya bilinçli kuyruk
4. [ ] Müşteriye bilgi (özel domain) — DNS TTL düşürme (300 sn önerilir)
5. [ ] Operatör konsol → domain listesi → ilgili domain `verificationStatus`

---

## 4. DKIM rotasyon (önerilen: dual-selector)

### 4.1 Yeni anahtar üret (VPS)

**Özel domain (müşteri):**

```bash
sudo bash scripts/register-opendkim-custom-domain.sh musteri.com.tr s202609
```

Yeni selector ile ayrı dizin; mevcut `default` satırları KeyTable/SigningTable’da kalır.

**Platform / tenant:** `scripts/setup-opendkim-kullanici-lerta-tr.sh` veya pilot script’i yeni selector ile uyarlayın; aynı dual-publish mantığı.

### 4.2 DNS — iki TXT birlikte yayında

1. Eski: `default._domainkey.musteri.com.tr` → mevcut `v=DKIM1; …`
2. Yeni: `s202609._domainkey.musteri.com.tr` → yeni public key

TTL düşük tutun; `dig +short TXT` ile her iki host doğrulanana kadar bekleyin (global propagasyon 15–60 dk).

### 4.3 İmzayı yeni selector’a al

- OpenDKIM SigningTable’da `*@domain` satırını yeni selector’a yönlendirin **veya** API verify akışı ile `MAIL_SYNC_OPENDKIM` üzerinden güncel private key kullanın.
- `sudo systemctl restart opendkim postfix`
- Test: `opendkim-testkey -d musteri.com.tr -s s202609 -vvv` (paket yüklüyse)

### 4.4 Veritabanı / konsol

- Admin veya tenant **DNS doğrula** (`POST …/custom-domain/verify-dns`) — snapshot’taki `dkimTxt` müşteri panelinde güncellenmiş olmalı.
- Gerekirse platform admin domain kaydında `dnsSnapshot` selector ve TXT güncellemesi (yeni kurulumda API zaten üretir).

### 4.5 Eski selector’ı kaldır

1. En az **48 saat** dual-publish + DMARC’ta yeni selector `pass` görüldükten sonra
2. DNS’ten eski `default._domainkey` TXT silin
3. KeyTable/SigningTable’dan eski satırları kaldırın; `opendkim` restart
4. Eski private key dosyasını güvenli silin (`shred` / offline backup politikası)

---

## 5. SPF rotasyon (IP değişimi)

1. Yeni IP için **A** kaydı (`mail.lerta…`) ve **PTR** (Hostinger panel) — [EMAIL_FAZ_A_PRODUCTION.md](./EMAIL_FAZ_A_PRODUCTION.md) A5
2. Yeni SPF: `v=spf1 ip4:YENİ_IP -all` (veya geçişte `ip4:ESKİ ip4:YENİ -all` kısa pencere)
3. `.env`: `MAIL_PLATFORM_SPF_IPV4=YENİ_IP` → API restart (yeni tenant/custom domain SPF önerileri doğru IP’yi gösterir)
4. Müşteri özel domain’lerde konsol SPF satırını güncellemeleri için bildirim / destek
5. Eski IP’yi SPF’ten kaldırın; 24 saat sonra DMARC SPF pass oranını kontrol edin

---

## 6. DMARC rotasyon penceresinde

- Rotasyon süresince tenant DMARC: `p=none` veya mevcut `quarantine` — `reject` kullanmayın
- `rua=mailto:dmarc@…` raporları: konsol `/dmarc` veya operatör ingest ([MAIL_DMARC_RUA_INGEST.md](./MAIL_DMARC_RUA_INGEST.md))
- Başarı: `dkimPass` / `spfPass` artar; `dkimFail` spike yok

---

## 7. Otomasyon bayrakları (VPS `.env`)

| Değişken | Açıklama |
|----------|----------|
| `MAIL_SYNC_OPENDKIM=true` | Domain verify/kayıtta OpenDKIM tablolarına yaz |
| `MAIL_PLATFORM_SPF_IPV4` | SPF öneri metni |
| `MAIL_PLATFORM_DOMAIN` | Platform mail host |
| `MAIL_PLATFORM_TENANT_DOMAIN` | Tenant inbound host |

Rotasyon sonrası API container restart; `TYPEORM` değişikliği gerekmez (DNS snapshot manuel/admin nadiren).

---

## 8. Doğrulama komutları

```bash
# Platform + tenant özet
bash scripts/verify-mail-dns-lerta.sh

# Özel domain (manuel)
DOMAIN=musteri.com.tr
dig +short TXT "${DOMAIN}"
dig +short TXT "default._domainkey.${DOMAIN}"
dig +short TXT "_dmarc.${DOMAIN}"
```

Canlı gönderim: test mesajı → Gmail “Orijinal iletiyi göster” → `DKIM-Signature` selector ve `spf=pass`.

---

## 9. Geri alma (rollback)

1. SigningTable’ı eski selector’a geri al; `opendkim` + `postfix` restart
2. DNS’te eski DKIM TXT hâlâ yayında olsun (dual-publish ise zaten vardır)
3. SPF’te eski IP’yi geri ekle
4. DMARC spike varsa `p=none` geçici

Olay kaydı: tenant denetim (`/audit`) ve operatör notu (`PlatformMailTenantAdminService` note).

---

## 10. Sorumluluklar

| Rol | Görev |
|-----|--------|
| Operatör | VPS OpenDKIM, platform DNS, ingest, tenant askı |
| Firma sahibi | Özel domain DNS TXT/MX (konsol talimatları) |
| Destek | Müşteriye dual-publish penceresi ve TTL |

---

## 11. İlgili scriptler

- `scripts/register-opendkim-custom-domain.sh` — müşteri domain DKIM VPS
- `scripts/setup-opendkim-kullanici-lerta-tr.sh` — tenant alt alan
- `scripts/setup-mail-lerta-com-tr-pilot.sh` — pilot platform
- `scripts/verify-mail-dns-lerta.sh` — hızlı DNS kontrol

**Runbook sürümü:** E6 (2026-09) — ürün roadmap [LERTA_MAIL_PRODUCT_ROADMAP.md](./LERTA_MAIL_PRODUCT_ROADMAP.md).
