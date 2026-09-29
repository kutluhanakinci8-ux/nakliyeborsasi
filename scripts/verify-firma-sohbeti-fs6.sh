#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
echo "== FS-6 verify =="
payload="$(curl -fsS "${API_BASE}/messaging/status")"
python3 <<'PY' "${payload}"
import json, sys
features = set(json.load(sys.argv[1]).get("features") or [])
need = {
    "slack_incoming_bridge",
    "automation_catalog_zapier_make",
    "messaging_bot_tokens",
    "public_api_messaging_write",
    "optional_ws_gateway",
}
missing = need - features
if missing:
    raise SystemExit(f"FAIL: {missing}")
print("OK: FS-6 status features")
PY
curl -fsS "${API_BASE}/messaging/integration/automation-catalog" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('catalog',{}).get('version'); print('OK: automation catalog')"
echo "FS-6 verify: PASS"
