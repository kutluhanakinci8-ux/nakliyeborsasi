#!/usr/bin/env bash
# FS-2: operasyon zekâsı — arama, şablonlar, insights API.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
# shellcheck source=scripts/resolve-messaging-verify-jwt.sh
source "${ROOT}/scripts/resolve-messaging-verify-jwt.sh" || true

echo "== FS-2 firma sohbeti verify =="
payload="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
python3 "${ROOT}/scripts/messaging-status-from-env.py" fs2

JWT="$(resolve_messaging_verify_jwt 2>/dev/null || true)"
if [[ -z "${JWT}" ]]; then
  echo "SKIP: messaging verify JWT yok — search/quick-replies smoke"
  exit 0
fi

echo "== quick-replies =="
curl -fsS -H "Authorization: Bearer ${JWT}" \
  "${API_BASE}/messaging/quick-replies?lang=tr" | python3 -c "
import sys, json
d=json.load(sys.stdin)
assert len(d.get('templates',[]))>=10
print('OK: templates', len(d['templates']))
"

echo "== search (validation) =="
code="$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${JWT}" \
  "${API_BASE}/messaging/search?lang=tr&q=a")"
[[ "${code}" == "400" ]] && echo "OK: short query rejected (${code})"

echo "FS-2 verify: PASS"
