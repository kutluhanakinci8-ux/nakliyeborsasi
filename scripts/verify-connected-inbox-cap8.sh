#!/usr/bin/env bash
set -euo pipefail
BASE="${MAIL_API_BASE:-https://posta.lerta.com.tr/api/v1}"
echo "CAP-8 smoke: connected inbox public + docs"
curl -fsS -o /dev/null -w "%{http_code}" "${BASE}/public/mail-connected/gmail/pubsub" \
  -X POST -H "Content-Type: application/json" -d '{}' | grep -q '^200$'
curl -fsS -o /dev/null -w "%{http_code}" "${BASE}/public/mail-connected/microsoft/graph" \
  -X POST -H "Content-Type: application/json" -d '{}' | grep -q '^200$'
test -f scripts/sql/mail-connected-accounts-cap3.sql
echo "OK: connected inbox CAP-8 public endpoints reachable"
