# PM-5 — IMAP / Dovecot parite runbook

## Hedef
Thunderbird / Apple Mail ile **Gelen, Gönderilen, Arşiv, Çöp, Spam** klasörleri webmail ile uyumlu.

## VPS adımları

1. `bash scripts/setup-dovecot-c4.sh` (ilk kurulum)
2. `.env`: `MAIL_IMAP_MAILDIR_ROOT=/var/mail/vhosts` (örnek)
3. Platform admin → Mail → **IMAP Dovecot sync** veya `POST /platform-admin/mail/imap/sync-dovecot`
4. Otomatik (deploy): `bash scripts/provision-pm5-imap-dovecot-vps.sh` — eksik credential + passwd + maildir (şifreler `/root/lerta-imap-credentials-bootstrap.txt`)
5. Manuel: Org ayarları → **IMAP şifresi yenile**; platform **sync-dovecot**
6. Doğrulama: `bash scripts/verify-dovecot-imap-pm5.sh nakliyeborsasi@lerta.com.tr`

**Prod deploy (2026-09-28):** PR #129 → `VPS_BRANCH=cursor/mail-messaging-parity-100-519e` deploy; `main` merge sonrası varsayılan `deploy-vps-ssh.sh` yeterli.

## Kod (API)
- Gelen MIME → Maildir `new`
- Arşiv/çöp taşıma → `.Archive` / `.Trash`
- Spam (blocked) → `.Junk` (`relocateMailboxFile(..., "junk")`)
- Gönderilen → `.Sent/cur` (`appendSentMessage`)
- `GET company/mail-inbox/imap-health` — maildir + klasör iskeleti durumu

## Smoke test
1. `bash scripts/configure-dovecot-imap-gold-folders.sh` (SPECIAL-USE)
2. `bash scripts/smoke-imap-gold.sh email@lerta.com.tr` — otomatik LOGIN/LIST
3. Manuel: [MAIL_IMAP_GOLD_SMOKE.md](./MAIL_IMAP_GOLD_SMOKE.md)
4. Webmail’den arşivle → IMAP’te Arşiv dolmalı
5. Thunderbird’dan sil → web çöp ile uyumlu (tek yön gecikme TTL)
