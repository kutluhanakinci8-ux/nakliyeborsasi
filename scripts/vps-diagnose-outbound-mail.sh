#!/usr/bin/env bash
# VPS: giden posta (webmail → API → Postfix) teşhis.
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"

echo "==> .env (mail)"
grep -E '^EMAIL_ENABLED=|^SMTP_HOST=|^SMTP_PORT=' "${ENV_FILE}" 2>/dev/null || true

echo "==> Postfix queue"
mailq 2>/dev/null | head -20 || true

echo "==> Son giden / reject (mail.log)"
if [[ -f /var/log/mail.log ]]; then
  tail -60 /var/log/mail.log | grep -iE 'reject|bounce|opendkim|abayer|post\.lerta|status=sent|status=deferred' || tail -20 /var/log/mail.log
fi

echo "==> OpenDKIM SigningTable (abayer)"
grep -i abayer /etc/opendkim/SigningTable 2>/dev/null || true

echo "==> API PM2"
pm2 list 2>/dev/null | grep -iE 'api|nakliye' || true
