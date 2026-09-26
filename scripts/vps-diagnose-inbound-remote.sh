#!/usr/bin/env bash
set -euo pipefail
cd /var/www/nakliyeborsasi

echo "=== GIT ==="
git rev-parse --short HEAD

echo "=== kutluhan virtual map ==="
grep -i kutluhan /etc/postfix/lerta-inbound-virtual 2>/dev/null | head -5 || echo "(no match)"

echo "=== POSTFIX QUEUE ==="
mailq 2>/dev/null | head -25 || postqueue -p 2>/dev/null | head -25 || true

echo "=== MAIL.LOG tail (inbound/pipe/reject) ==="
if [[ -f /var/log/mail.log ]]; then
  tail -80 /var/log/mail.log | grep -iE "kutluhan|pipe|lerta|reject|bounce|warning" || tail -30 /var/log/mail.log
else
  journalctl -u postfix --no-pager -n 40 2>/dev/null || true
fi

echo "=== MAIL_INBOUND_WEBHOOK_SECRET ==="
if grep -q '^MAIL_INBOUND_WEBHOOK_SECRET=.' .env 2>/dev/null; then
  echo "present"
else
  echo "MISSING or empty"
fi

echo "=== Pipe script executable ==="
PIPE=/var/www/nakliyeborsasi/scripts/postfix-pipe-inbound-to-api.sh
ls -la "$PIPE" 2>/dev/null || echo "pipe missing"

echo "=== API health ==="
curl -sf -o /dev/null -w "health %{http_code}\n" http://127.0.0.1:3010/health || echo "API down"

echo "=== PM2 ==="
pm2 jlist 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print([(x.get('name'), x.get('pm2_env',{}).get('status')) for x in d])" 2>/dev/null || pm2 list

echo "=== DB recent inbound (if psql works) ==="
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env 2>/dev/null || true
  set +a
fi
if [[ -n "${DATABASE_URL:-}" ]]; then
  psql "$DATABASE_URL" -t -c "SELECT received_at, from_address, subject FROM mail_inbound_message WHERE to_address ILIKE '%kutluhan%' ORDER BY received_at DESC LIMIT 5;" 2>/dev/null || echo "psql failed"
else
  echo "no DATABASE_URL"
fi
