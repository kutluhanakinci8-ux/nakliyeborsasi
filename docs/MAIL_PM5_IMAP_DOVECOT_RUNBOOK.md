# PM-5 — IMAP / Dovecot parite runbook

## Hedef
Thunderbird / Apple Mail ile **Gelen, Gönderilen, Arşiv, Çöp, Spam** klasörleri webmail ile uyumlu.

## VPS adımları

1. `bash scripts/setup-dovecot-c4.sh` (ilk kurulum)
2. `.env`: `MAIL_IMAP_MAILDIR_ROOT=/var/mail/vhosts` (örnek)
3. Platform admin → Mail → **IMAP Dovecot sync** veya `POST /platform-admin/mail/imap/sync-dovecot`
4. Org ayarları → **IMAP şifresi yenile** (veya ilk kurulum) — `mail_imap_credential` kaydı oluşur
5. Adım 3’ü tekrarlayın (`sync-dovecot`) — `/etc/dovecot/lerta-imap-passwd` güncellenir
6. Doğrulama: `bash scripts/verify-dovecot-imap-pm5.sh nakliyeborsasi@lerta.com.tr`

**Prod deploy (2026-09-28):** PR #129 → `VPS_BRANCH=cursor/mail-messaging-parity-100-519e` deploy; `main` merge sonrası varsayılan `deploy-vps-ssh.sh` yeterli.

## Kod (API)
- Gelen MIME → Maildir `new`
- Arşiv/çöp taşıma → `.Archive` / `.Trash`
- Spam (blocked) → `.Junk` (`relocateMailboxFile(..., "junk")`)
- Gönderilen → `.Sent/cur` (`appendSentMessage`)
- `GET company/mail-inbox/imap-health` — maildir + klasör iskeleti durumu

## Smoke test
1. Webmail’den arşivle → IMAP’te `.Archive` dolmalı
2. Thunderbird’dan sil → web çöp ile uyumlu (tek yön gecikme TTL)
