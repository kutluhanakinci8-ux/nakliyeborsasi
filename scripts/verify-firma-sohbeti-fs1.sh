#!/usr/bin/env bash
# FS-1: üretim güveni — status bayrakları, XLSX ek politikası, SSE smoke.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE="${API_BASE:-http://127.0.0.1:3000/api/v1}"

echo "== FS-1 firma sohbeti verify =="
echo "API: ${API_BASE}/messaging/status"

payload="$(curl -fsS "${API_BASE}/messaging/status")"

python3 <<'PY' "${payload}"
import json, sys
data = json.loads(sys.argv[1])
features = set(data.get("features") or [])
required = {
    "sse_stream",
    "attachments",
    "web_push",
}
missing = required - features
if missing:
    raise SystemExit(f"FAIL: eksik features: {sorted(missing)}")
atts = data.get("attachments") or {}
if atts.get("maxBytesPerFile") != 10_000_000:
    raise SystemExit(f"FAIL: maxBytesPerFile beklenen 10000000, gelen {atts.get('maxBytesPerFile')}")
allowed = atts.get("allowedContentTypes") or []
xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
if xlsx not in allowed:
    raise SystemExit(f"FAIL: XLSX content-type listede yok")
if "sse" not in data:
    raise SystemExit("FAIL: sse stats yok")
print("OK: status features + attachments + sse")
PY

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
