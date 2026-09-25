# Yedekleme ve felaket kurtarma (E7) — Lerta Mail

**Üretim VPS (örnek):** `168.231.109.27`  
**Maildir kökü:** `MAIL_IMAP_MAILDIR_ROOT` → varsayılan `/var/mail/vhosts`  
**İlişkili:** [MAIL_SPF_DKIM_ROTATION_RUNBOOK.md](./MAIL_SPF_DKIM_ROTATION_RUNBOOK.md), [EMAIL_FAZ_A_PRODUCTION.md](./EMAIL_FAZ_A_PRODUCTION.md)

---

## 1. Hedefler (RPO / RTO)

| Katman | RPO (kayıp veri) | RTO (geri dönüş) | Not |
|--------|------------------|------------------|-----|
| **PostgreSQL** (tenant, mesaj meta, outbox) | ≤ 24 saat (günlük dump) + WAL/hosting varsa daha iyi | 2–4 saat | Ana gerçek: `mail_inbound_message`, abonelik, domain |
| **Maildir** (ham `.eml`, IMAP) | ≤ 24 saat | 2–6 saat | Boyut büyüdüğünde artar |
| **OpenDKIM / Postfix config** | Haftalık veya her değişiklikte | 1 saat | `/etc/opendkim`, KeyTable |
| **Uygulama `.env`** | Her değişiklikte (şifreli kasa) | 30 dk | `JWT_SECRET`, TOTP key, webhook |

**Pilot / tek VPS:** RPO 24h ve RTO 4h makul başlangıç; kurumsal SLA için günlük dump + saatlik Maildir `rsync` ve off-site kopya önerilir.

---

## 2. Neyi yedekliyoruz?

### 2.1 Zorunlu

1. **PostgreSQL** — tüm `mail_*`, `email_*`, `user_accounts`, `company_*` tabloları (tam cluster dump veya `nakliyeborsasi` DB)
2. **`MAIL_IMAP_MAILDIR_ROOT`** — `domain/local/Maildir/{new,cur,.Archive,.Trash}/`
3. **`/etc/opendkim`** — özellikle `keys/`, `KeyTable`, `SigningTable`

### 2.2 Önerilen

- `/etc/postfix`, `/etc/dovecot`, Rspamd özel kurallar
- Nginx site config (`posta`, `yonetim`, API)
- Let’s Encrypt `/etc/letsencrypt` (veya DNS-only yenileme planı)
- Stripe webhook secret / billing env (ayrı secret store)

### 2.3 Konsol / API’de zaten olan

- KVKK JSON export (E3) — **yedek değildir**; müşteri talebi için
- DMARC aggregate DB — dump içinde; ayrıca `rua` ham XML arşivi isteğe bağlı

---

## 3. Otomatik scriptler (VPS)

### 3.1 Maildir + OpenDKIM arşivi

```bash
sudo bash scripts/backup-mail-vps-snapshot.sh
```

Ortam:

| Değişken | Varsayılan |
|----------|------------|
| `MAIL_IMAP_MAILDIR_ROOT` | `/var/mail/vhosts` |
| `LERTA_MAIL_BACKUP_DIR` | `/var/backups/lerta-mail` |
| `LERTA_MAIL_BACKUP_RETENTION_DAYS` | `14` |

Üretir: `maildir-YYYYMMDD-HHMMSS.tar.gz`, `opendkim-YYYYMMDD-HHMMSS.tar.gz`

### 3.2 PostgreSQL (örnek)

```bash
# DATABASE_URL veya PG* ortamınızla
pg_dump "$DATABASE_URL" --format=custom --file="$LERTA_MAIL_BACKUP_DIR/pg-$(date +%Y%m%d).dump"
```

Hostinger / Docker compose kullanıyorsanız container adını runbook notlarına ekleyin.

### 3.3 Cron (örnek)

```cron
0 3 * * * root MAIL_IMAP_MAILDIR_ROOT=/var/mail/vhosts bash /opt/nakliyeborsasi/scripts/backup-mail-vps-snapshot.sh >> /var/log/lerta-mail-backup.log 2>&1
15 3 * * * root pg_dump ... >> /var/log/lerta-mail-backup.log 2>&1
```

Off-site: `rclone` / S3 / ikinci VPS’e `rsync -a` (şifreli disk veya bucket).

---

## 4. Maildir geri yükleme

**Dikkat:** Canlı Maildir üzerine doğrudan extract veri kaybına yol açar.

```bash
# Önce servisleri durdurun veya kullanıcıyı bilgilendirin
sudo systemctl stop dovecot postfix

sudo bash scripts/restore-maildir-from-archive.sh \
  /var/backups/lerta-mail/maildir-20260925-030001.tar.gz \
  --target-root /var/mail/vhosts \
  --confirm

sudo systemctl start dovecot postfix
```

Script yalnızca `--confirm` ile yazır; önce dry-run çıktısını okuyun.

DB’deki `maildir_file_path` ile dosya yolu uyumsuzsa webmail “mesaj var ama dosya yok” gösterir — tam DR’de **PG dump + Maildir aynı zaman diliminden** restore edin.

---

## 5. Felaket senaryoları

| Senaryo | Adımlar |
|---------|---------|
| Disk dolu | Maildir büyüklüğü; eski `.Trash`; backup retention; kota (D5) |
| VPS kaybı | Yeni VPS; DNS IP/PTR; restore PG + Maildir + OpenDKIM; `.env`; [SPF/DKIM runbook](./MAIL_SPF_DKIM_ROTATION_RUNBOOK.md) |
| Tek tenant KVKK silme | E3 erasure — **geri alınamaz**; yedekten restore sadece tam DR politikası ile |
| DB bozulması | Son `pg_dump` restore; Maildir tutarlılık kontrolü |
| Yanlış Maildir silme | Son arşivden restore; DB PITR varsa meta da hizalanır |

---

## 6. Doğrulama (aylık drill)

1. [ ] Test VPS veya staging’de son backup arşivini aç
2. [ ] Rastgele 3 mailbox’ta `.eml` sayısı vs DB `mail_inbound_message` (yaklaşık)
3. [ ] Dovecot `doveadm mailbox status` (üretimde düşük trafik penceresi)
4. [ ] Restore süresini ölç → RTO güncelle
5. [ ] Operatör notu + `/audit` kaydı (isteğe bağlı internal ticket)

---

## 7. Güvenlik

- Yedekler **şifreli** depoda (at-rest); DKIM private key içerir
- Erişim: operatör rolü + VPS SSH key rotation
- Müşteri verisi KVKK — off-site sözleşme ve lokasyon (TR/EU) dokümante

---

## 8. Script referansı

| Script | Amaç |
|--------|------|
| `scripts/backup-mail-vps-snapshot.sh` | Maildir + OpenDKIM tarball |
| `scripts/restore-maildir-from-archive.sh` | Maildir geri yükleme |
| `scripts/verify-mail-dns-lerta.sh` | DR sonrası DNS |

**Sürüm:** E7 — [LERTA_MAIL_PRODUCT_ROADMAP.md](./LERTA_MAIL_PRODUCT_ROADMAP.md)
