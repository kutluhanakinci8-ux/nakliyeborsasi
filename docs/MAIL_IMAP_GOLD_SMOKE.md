# IMAP gold smoke — Thunderbird & Apple Mail

**Amaç:** Webmail ile **Gelen / Gönderilen / Arşiv / Çöp / Spam** klasörlerinin harici istemcide doğru görünmesi ve LOGIN’in çalışması.

## Otomatik (VPS / CI)

```bash
# 1) Özel klasör namespace (bir kez)
bash scripts/configure-dovecot-imap-gold-folders.sh

# 2) Şifre: webmail Ayarlar → IMAP (self-servis) — bkz. MAIL_IMAP_SELF_SERVICE.md
#    Ops break-glass: bash scripts/rotate-imap-credential-vps.sh kullanici@lerta.com.tr
export IMAP_GOLD_EMAIL='kullanici@lerta.com.tr'
export IMAP_GOLD_PASSWORD='...'
bash scripts/smoke-imap-gold.sh

# veya
bash scripts/smoke-imap-gold.sh kullanici@lerta.com.tr 'imap-sifresi'
```

Önkoşul: `verify-dovecot-imap-pm5.sh` PASS.

## Manuel — Thunderbird

1. Hesap → IMAP `mail.lerta.com.tr:993` SSL, kullanıcı = tam adres, şifre = IMAP şifresi.
2. Abonelikler: **Gelen**, **Arşiv**, **Çöp**, **Gereksiz**, **Gönderilen** görünür olmalı.
3. Webmail’de test mesajı **arşivle** → Thunderbird’de Arşiv’de görün (≤1 dk).
4. Thunderbird’de sil → webmail **Çöp**’te görün (tek yön gecikme olabilir).

## Manuel — Apple Mail (macOS / iOS)

1. Ayarlar → Posta → Hesap Ekle → Diğer → IMAP.
2. Sunucu `mail.lerta.com.tr`, SSL, tam e-posta + IMAP şifresi.
3. Gelişmiş: **Gereksiz**, **Çöp Kutusu**, **Arşiv** otomatik eşleşmeli (Dovecot `\Junk`, `\Trash`, `\Archive`).
4. Gönderilen: webmail’den mail at → **Gönderilen** klasöründe (`.Sent/cur`).

## TLS (Thunderbird / Apple)

IMAP SSL sertifikası `MAIL_IMAP_HOST` (varsayılan `mail.lerta.com.tr`) ile eşleşmeli:

```bash
certbot certonly --nginx -d mail.lerta.com.tr   # veya DNS/standalone
bash scripts/configure-dovecot-imap-tls-le.sh
```

Dovecot `userdb` Debian’da `gid=mail` olmalı (`fix-dovecot-lerta-userdb-gid.sh`).

## Başarısızlık

| Belirti | Kontrol |
|---------|---------|
| LOGIN hata | `doveadm auth test email pass` · passwd sync · rotate IMAP · `journalctl -u dovecot` (Invalid gid vmail) |
| SSL hostname | `openssl s_client -connect mail.lerta.com.tr:993` · `configure-dovecot-imap-tls-le.sh` |
| Klasör eksik | `verify-dovecot-imap-pm5.sh` · `configure-dovecot-imap-gold-folders.sh` |
| Mesaj yok | Inbound postfix · webmail gelen · maildir `new/` izinleri `vmail` |

## İlgili

- [MAIL_PM5_IMAP_DOVECOT_RUNBOOK.md](./MAIL_PM5_IMAP_DOVECOT_RUNBOOK.md)
- [MAIL_THUNDERBIRD_IMAP.md](./MAIL_THUNDERBIRD_IMAP.md)
