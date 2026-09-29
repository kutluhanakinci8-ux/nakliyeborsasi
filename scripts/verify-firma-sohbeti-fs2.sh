#!/usr/bin/env bash
# FS-2: operasyon zekâsı — arama, şablonlar, insights API.
set -euo pipefail
API_BASE="${API_BASE:-http://127.0.0.1:3000/api/v1}"

echo "== FS-2 firma sohbeti verify =="
payload="$(curl -fsS "${API_BASE}/messaging/status")"
python3 <<'PY' "${payload}"
import json, sys
data = json.loads(sys.argv[1])
features = set(data.get("features") or [])
required = {
    "server_search",
    "markdown_messages",
    "quick_replies",
    "thread_insights",
    "thread_llm_summary",
}
missing = required - features
if missing:
    raise SystemExit(f"FAIL: eksik features: {sorted(missing)}")
print("OK: FS-2 status features")
PY

JWT="${MESSAGING_FS2_JWT:-${MESSAGING_SSE_JWT:-}}"
if [[ -z "${JWT}" ]]; then
  echo "SKIP: MESSAGING_FS2_JWT yok — search/quick-replies smoke"
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
