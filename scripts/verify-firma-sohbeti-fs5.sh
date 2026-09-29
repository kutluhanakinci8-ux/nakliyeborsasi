#!/usr/bin/env bash
set -euo pipefail
API_BASE="${API_BASE:-http://127.0.0.1:3000/api/v1}"
echo "== FS-5 verify =="
payload="$(curl -fsS "${API_BASE}/messaging/status")"
python3 <<'PY' "${payload}"
import json, sys
features = set(json.load(sys.argv[1]).get("features") or [])
need = {
    "outbound_webhooks",
    "public_api_messaging_read",
    "retention_policy_job",
    "chat_accept_fixed_price",
    "notify_push_messaging_chat",
}
missing = need - features
if missing:
    raise SystemExit(f"FAIL: {missing}")
print("OK: FS-5 status features")
PY
echo "FS-5 verify: PASS"
