# Faz C4 — MIME/HTML, IMAP, Rspamd (sırayla)

## 1. MIME / HTML

- `MailMimePartParser` — multipart plain + html
- `bodyHtml` (sanitize edilmiş) + `bodyText` inbound tablosunda
- UI: HTML görünüm `iframe` + `srcDoc`

## 2. IMAP (Dovecot + Maildir)

VPS:

```bash
MAIL_IMAP_MAILDIR_ROOT=/var/mail/vhosts bash scripts/setup-dovecot-c4.sh
```

`.env`:

```bash
MAIL_IMAP_MAILDIR_ROOT=/var/mail/vhosts
MAIL_IMAP_HOST=mail.lerta.tr
MAIL_IMAP_PORT=993
MAIL_IMAP_APPLY_DOVECOT=true
MAIL_IMAP_DOVECOT_PASSWD_PATH=/etc/dovecot/lerta-imap-passwd
```

Akış:

1. Inbound → API + `Maildir/new/*.eml`
2. Firma sahibi: `POST /company/mail-inbox/imap-credentials/rotate` (şifre bir kez gösterilir)
3. Admin: `POST /platform-admin/mail/imap/sync-dovecot`

Thunderbird / Outlook: IMAP SSL, kullanıcı = kurumsal e-posta adresi.

## 3. Rspamd

```bash
bash scripts/setup-rspamd-c4.sh
```

- Postfix milter `127.0.0.1:11332`
- Pipe script `rspamc symbols` → webhook `rspamdScore` / `rspamdAction`
- `MAIL_RSPAMD_REJECT_SCORE=15` (varsayılan) — üzeri **blocked**

Keyword spam (C3) Rspamd ile birlikte çalışır.

## Sonraki

- Giden HTML şablonları, tam threading UI, Rspamd öğrenme modu
