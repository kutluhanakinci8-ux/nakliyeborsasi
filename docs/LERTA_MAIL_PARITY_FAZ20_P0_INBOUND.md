# Parite Faz 20 — P0 inbound (Rspamd/Dovecot, DNS)

**Amaç:** Gelen posta itibarı ve IMAP için tek doğrulama komutu + deploy bayrağı.

## Doğrulama

```bash
bash scripts/verify-lerta-mail-inbound-p0.sh
# VPS üzerinde servis kontrolü:
LOCAL_VPS=1 bash scripts/verify-lerta-mail-inbound-p0.sh
```

Deploy checklist: `run-lerta-mail-vps-deploy-checklist.sh` bu adımı çalıştırır.

## VPS inbound stack (root, bir kez veya güncelleme)

```bash
cd /var/www/nakliyeborsasi
MAIL_APPLY_INBOUND_STACK=1 bash scripts/deploy-production-vps.sh
# veya doğrudan:
bash scripts/apply-mail-vps-inbound-stack.sh
```

Manuel DNS: `scripts/print-instant-post-dns-isimtescil.sh` · `verify-lerta-post-dns.sh`
