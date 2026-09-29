#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
echo "== FS-4 verify =="
payload="$(curl -fsS "${API_BASE}/messaging/status")"
python3 <<'PY' "${payload}"
import json, sys
data = json.load(sys.argv[1])
features = set(data.get("features") or [])
need = {
    "sse_redis_fanout",
    "thread_legal_hold",
    "messaging_crud_audit",
    "ediscovery_zip_sha256",
    "company_message_rate_limit",
}
missing = need - features
if missing:
    raise SystemExit(f"FAIL: missing features {missing}")
sse = data.get("sse") or {}
print("OK: FS-4 features; sse.redisFanout=", sse.get("redisFanout"), "instance=", sse.get("instanceId"))
PY
echo "FS-4 verify: PASS"
