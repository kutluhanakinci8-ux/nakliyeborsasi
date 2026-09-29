#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
echo "== FS-7 verify =="
payload="$(curl -fsS "${API_BASE}/messaging/status")"
python3 <<'PY' "${payload}"
import json, sys
features = set(json.load(sys.argv[1]).get("features") or [])
need = {
    "group_threads_pilot",
    "whatsapp_notify_bridge",
    "native_shell_capacitor_docs",
}
missing = need - features
if missing:
    raise SystemExit(f"FAIL: {missing}")
print("OK: FS-7 status features")
PY
test -f docs/MESSAGING_NATIVE_SHELL_FS7.md
test -f apps/web/capacitor.config.ts
echo "FS-7 verify: PASS"
