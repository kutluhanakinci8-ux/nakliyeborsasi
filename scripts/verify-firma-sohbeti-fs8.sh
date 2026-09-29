#!/usr/bin/env bash
# FS-8: firma arama API, hub varsayılan sekme, status bayrakları.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

echo "== FS-8 firma sohbeti verify =="
echo "API: ${API_BASE}/messaging/status"

payload="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
python3 "${ROOT}/scripts/messaging-status-from-env.py" fs8

JWT="${MESSAGING_TEST_JWT:-${MESSAGING_SSE_JWT:-}}"
if [[ -n "${JWT}" ]]; then
  echo ""
  echo "== company search smoke =="
  code="$(curl -s -o /tmp/fs8-company-search.json -w "%{http_code}" \
    -H "Authorization: Bearer ${JWT}" \
    "${API_BASE}/messaging/companies/search?lang=tr&q=ata")"
  echo "GET companies/search HTTP ${code}"
  [[ "${code}" == "200" ]] || exit 1
  python3 -c "import json; d=json.load(open('/tmp/fs8-company-search.json')); assert 'companies' in d"
  echo "OK: companies/search body"
  echo ""
  echo "== hub-default smoke =="
  code="$(curl -s -o /tmp/fs8-hub.json -w "%{http_code}" \
    -H "Authorization: Bearer ${JWT}" \
    "${API_BASE}/messaging/hub-default?lang=tr")"
  echo "GET hub-default HTTP ${code}"
  [[ "${code}" == "200" ]] || exit 1
  python3 -c "import json; d=json.load(open('/tmp/fs8-hub.json')); assert d.get('defaultTab') in ('email','chat')"
  echo "OK: hub-default body"
else
  echo "SKIP: MESSAGING_TEST_JWT / MESSAGING_SSE_JWT yok (auth smoke)"
fi

echo ""
echo "FS-8 verify: PASS"
