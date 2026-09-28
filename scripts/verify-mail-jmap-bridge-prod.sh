#!/usr/bin/env bash
# PM-10: JMAP köprü uç noktası prod'da mount (auth gerekir).
set -euo pipefail
API_BASE="${API_BASE:-https://app.lerta.com.tr/api/v1}"
SESSION_URL="${API_BASE}/company/mail-jmap/session"
CODE="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 15 "${SESSION_URL}" || echo "000")"
echo "GET company/mail-jmap/session → HTTP ${CODE}"
if [[ "${CODE}" == "401" || "${CODE}" == "403" ]]; then
  echo "OK: JMAP session korumalı (beklenen)."
  exit 0
fi
if [[ "${CODE}" == "200" ]]; then
  echo "OK: JMAP session yanıt veriyor (oturum açık istek olabilir)."
  exit 0
fi
echo "NOT: beklenen 401/403 veya 200, alındı: ${CODE}" >&2
exit 1
