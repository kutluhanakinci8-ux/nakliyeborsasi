#!/usr/bin/env bash
# FS-1: üretim güveni — status bayrakları, XLSX ek politikası, SSE smoke.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
# shellcheck source=scripts/resolve-messaging-verify-jwt.sh
source "${ROOT}/scripts/resolve-messaging-verify-jwt.sh" || true

echo "== FS-1 firma sohbeti verify =="
echo "API: ${API_BASE}/messaging/status"

payload="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
python3 "${ROOT}/scripts/messaging-status-from-env.py" fs1

echo ""
echo "== SSE smoke (opsiyonel) =="
JWT="$(resolve_messaging_verify_jwt 2>/dev/null || true)"
SSE_SMOKE_MAX_TIME="${MESSAGING_SSE_SMOKE_MAX_TIME:-5}"
if [[ -n "${JWT}" ]]; then
  ticket="$(curl -fsS -H "Authorization: Bearer ${JWT}" -X POST \
    "${API_BASE}/messaging/stream/ticket?lang=tr" | python3 -c "import sys,json; print(json.load(sys.stdin)['ticket'])")"
  # SSE bağlantısı açık kalır; max-time sonunda curl 28 döner — http_code yine 200 olabilir.
  code="$(curl -s -o /dev/null -w "%{http_code}" --max-time "${SSE_SMOKE_MAX_TIME}" \
    "${API_BASE}/messaging/stream?ticket=${ticket}" || true)"
  echo "SSE HTTP ${code} (max-time ${SSE_SMOKE_MAX_TIME}s)"
  [[ "${code}" == "200" ]] || exit 1
  echo "OK: SSE stream"
else
  echo "SKIP: messaging verify JWT yok (MESSAGING_TEST_EMAIL/PASSWORD veya MESSAGING_*_JWT)"
fi

echo ""
echo "FS-1 verify: PASS"
