# Faz 6 sıralı UAT — 2026-10-25 (Europe/Istanbul)

## Otomasyon sonuçları (VPS)

| Adım | Durum | Not |
|------|--------|-----|
| **M1** IMAP gold | **PASS_AUTO** | `kutluhan@lerta.com.tr` — PM-5 maildir, doveadm auth, LIST (5 klasör), INBOX. Thunderbird ↔ webmail **manuel** ([MAIL_IMAP_GOLD_SMOKE.md](../MAIL_IMAP_GOLD_SMOKE.md)). |
| **M2** Outlook mobil | **PASS_SERVER** (bekleniyor) | `verify-uat-m2-outlook-mobile-imap.sh` — TLS/help/SMTP; Outlook uygulaması **manuel** |
| **M3** Graph OAuth | **DEFERRED** | En sonda — [MAIL_OAUTH_VPS_SETUP.md](../MAIL_OAUTH_VPS_SETUP.md) |
| **M4** Google Calendar | **DEFERRED** | En sonda |
| **M9** inbound P0 | **Kontrol** | `verify-lerta-mail-inbound-p0.sh` — MX/SPF/DMARC/DKIM OK; PTR Hostinger; `:25` ara sıra script uyarısı (Postfix aktif). Inbox teslim **manuel** §3.3. |
| **M6/M10** preflight | **PASS** | `uat-premium-preflight.sh` |

## Sıradaki (sıra)

1. **M2** Outlook mobil — sunucu: `bash scripts/verify-uat-m2-outlook-mobile-imap.sh`; telefonda Outlook ile `kutluhan@lerta.com.tr` bağla.
2. **M5** iOS PWA push — [MAIL_WEB_PUSH_IOS.md](../MAIL_WEB_PUSH_IOS.md).
4. **M7** kampanya A/B + webhook canlı.
5. **M8** KVKK export panel.
6. **M9** gönderim: pilot adrese MSN/Gmail/Outlook teslim testi.
7. **M3/M4** OAuth (en son).

Komut: `INSTALL_DIR=/var/www/nakliyeborsasi bash scripts/uat-faz6-sequential.sh`
