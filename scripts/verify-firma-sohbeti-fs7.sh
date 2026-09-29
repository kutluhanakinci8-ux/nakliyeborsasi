#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
echo "== FS-7 verify =="
payload="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
python3 -c "
import json, os
features = set(json.loads(os.environ['MESSAGING_STATUS_JSON']).get('features') or [])
need = {'group_threads_pilot','whatsapp_notify_bridge','native_shell_capacitor_docs'}
missing = need - features
if missing: raise SystemExit(f'FAIL: {missing}')
print('OK: FS-7 status features')
"
test -f "${ROOT}/docs/MESSAGING_NATIVE_SHELL_FS7.md"
test -f "${ROOT}/apps/web/capacitor.config.ts"
echo "FS-7 verify: PASS"
