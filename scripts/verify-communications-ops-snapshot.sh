#!/usr/bin/env bash
# MP-5: canlı /health/live + (opsiyonel) operatör communications-ops snapshot.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

echo "== MP-5 communications ops verify =="

live="$(curl -fsS --connect-timeout 5 --max-time 30 "${API_BASE}/health/live")"
python3 -c "import json,sys; d=json.load(sys.stdin); assert d.get('status')=='ok'; sse=d.get('messagingSse') or {}; assert 'connections' in sse; print('OK: /health/live sse.connections=', sse.get('connections'))" <<<"${live}"

status="$(curl -fsS --connect-timeout 5 --max-time 60 "${API_BASE}/messaging/status")"
python3 -c "import json,sys; d=json.load(sys.stdin); assert 'whatsappBridge' in d; assert d['whatsappBridge'].get('channel') in ('twilio','webhook','none'); print('OK: /messaging/status whatsappBridge')"

JWT="${OPERATOR_JWT:-${MESSAGING_TEST_JWT:-}}"
if [[ -n "${JWT}" ]]; then
  code="$(curl -sS -o /tmp/comm-ops.json -w "%{http_code}" \
    -H "Authorization: Bearer ${JWT}" \
    "${API_BASE}/platform-admin/communications-ops/snapshot")"
  if [[ "${code}" != "200" ]]; then
    echo "FAIL: communications-ops snapshot HTTP ${code}" >&2
    cat /tmp/comm-ops.json >&2
    exit 1
  fi
  python3 -c "import json; d=json.load(open('/tmp/comm-ops.json')); assert 'mail' in d and 'messaging' in d and 'slo' in d; print('OK: operator snapshot mail.outbox', d['mail']['outbox'])"
else
  echo "SKIP: OPERATOR_JWT yok — platform-admin/communications-ops/snapshot"
fi

echo "MP-5 communications ops verify: PASS"
