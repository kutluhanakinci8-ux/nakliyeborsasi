# Faz 6 sıralı UAT — 2026-10-25 (Europe/Istanbul)

## Otomasyon sonuçları (VPS)

| Adım | Durum | Not |
|------|--------|-----|
| **M1** IMAP gold | **PASS_AUTO** | `kutluhan@lerta.com.tr` — PM-5 maildir, doveadm auth, LIST (5 klasör), INBOX. Thunderbird ↔ webmail **manuel** ([MAIL_IMAP_GOLD_SMOKE.md](../MAIL_IMAP_GOLD_SMOKE.md)). |
| **M3** Graph OAuth | **MISSING_ENV** | VPS `.env`: `MICROSOFT_GRAPH_MAIL_*` yok |
| **M4** Google Calendar | **MISSING_ENV** | VPS `.env`: `GOOGLE_CALENDAR_*` yok |
| **M9** inbound P0 | **PASS_P0_DNS** (soft PTR) | MX/SPF/DMARC OK; PTR Hostinger uyarısı — [MAIL_PTR_HOSTINGER.md](../MAIL_PTR_HOSTINGER.md). Inbox teslim (MSN/Gmail) **manuel** §3.3. |
| **M6/M10** preflight | **PASS** | `uat-premium-preflight.sh` |

## Sıradaki (sıra)

1. **M3/M4** — Azure + Google Console redirect URI’leri; VPS `.env` doldur → `bash scripts/verify-uat-oauth-env.sh` → posta’da takvim bağlantısı smoke.
2. **M2** Outlook mobil IMAP (aynı kutuda mobil istemci).
3. **M5** iOS PWA push — [MAIL_WEB_PUSH_IOS.md](../MAIL_WEB_PUSH_IOS.md).
4. **M7** kampanya A/B + webhook canlı.
5. **M8** KVKK export panel.
6. **M9** gönderim: pilot adrese MSN/Gmail/Outlook teslim testi.

Komut: `INSTALL_DIR=/var/www/nakliyeborsasi bash scripts/uat-faz6-sequential.sh`
