#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
# shellcheck source=scripts/resolve-messaging-verify-jwt.sh
source "${ROOT}/scripts/resolve-messaging-verify-jwt.sh" || true
echo "== FS-3 verify =="
payload="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
python3 -c "
import json, os
features = set(json.loads(os.environ['MESSAGING_STATUS_JSON']).get('features') or [])
need = {'user_read_receipts','typing_indicator','internal_notes','message_edit_delete','user_mentions'}
missing = need - features
if missing: raise SystemExit(f'FAIL: {missing}')
print('OK: FS-3 status features')
"
JWT="$(resolve_messaging_verify_jwt 2>/dev/null || true)"
if [[ -n "${JWT}" ]]; then
  curl -fsS -H "Authorization: Bearer ${JWT}" \
    "${API_BASE}/messaging/colleagues?lang=tr" | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK: colleagues', len(d.get('colleagues',[])))"
fi
echo "FS-3 verify: PASS"
