#!/usr/bin/env bash
# FS-1: üretim güveni — status bayrakları, XLSX ek politikası, SSE smoke.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

echo "== FS-1 firma sohbeti verify =="
echo "API: ${API_BASE}/messaging/status"

payload="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
python3 "${ROOT}/scripts/messaging-status-from-env.py" fs1

echo ""
echo "== SSE smoke (opsiyonel) =="
JWT="${MESSAGING_SSE_JWT:-}"
if [[ -n "${JWT}" ]]; then
  ticket="$(curl -fsS -H "Authorization: Bearer ${JWT}" -X POST \
    "${API_BASE}/messaging/stream/ticket?lang=tr" | python3 -c "import sys,json; print(json.load(sys.stdin)['ticket'])")"
  code="$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/messaging/stream?ticket=${ticket}")"
  echo "SSE HTTP ${code}"
  [[ "${code}" == "200" ]] || exit 1
  echo "OK: SSE stream"
else
  echo "SKIP: MESSAGING_SSE_JWT yok"
fi

echo ""
echo "FS-1 verify: PASS"
