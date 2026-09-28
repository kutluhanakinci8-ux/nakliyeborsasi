#!/usr/bin/env bash
# SSE bağlantı limiti smoke (lokal API).
set -euo pipefail
API_BASE="${API_BASE:-http://127.0.0.1:3000/api/v1}"
JWT="${MESSAGING_SSE_JWT:-}"
if [[ -z "$JWT" ]]; then
  echo "SKIP: MESSAGING_SSE_JWT yok"
  exit 0
fi
ticket="$(curl -fsS -H "Authorization: Bearer $JWT" -X POST \
  "${API_BASE}/messaging/stream/ticket?lang=tr" | python3 -c "import sys,json; print(json.load(sys.stdin)['ticket'])")"
code="$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/messaging/stream?ticket=${ticket}")"
echo "SSE HTTP $code"
[[ "$code" == "200" ]] && echo OK || exit 1
