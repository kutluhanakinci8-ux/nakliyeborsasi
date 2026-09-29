#!/usr/bin/env bash
# FS-9: okundu paneli, grup UI, düzenle/sil modal, mention highlight, iç not filtresi.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

echo "== FS-9 firma sohbeti verify =="
payload="$(curl -fsS "${API_BASE}/messaging/status")"
export MESSAGING_STATUS_JSON="${payload}"
python3 "${ROOT}/scripts/messaging-status-from-env.py" fs9

JWT="${MESSAGING_TEST_JWT:-${MESSAGING_SSE_JWT:-}}"
if [[ -n "${JWT}" ]]; then
  echo ""
  echo "== messages read receipt fields (smoke) =="
  threads="$(curl -fsS -H "Authorization: Bearer ${JWT}" \
    "${API_BASE}/messaging/threads?lang=tr")"
  thread_id="$(python3 -c "import json,sys; t=json.load(sys.stdin).get('threads') or []; print(t[0]['threadId'] if t else '')" <<<"${threads}")"
  if [[ -n "${thread_id}" ]]; then
    curl -fsS -H "Authorization: Bearer ${JWT}" \
      "${API_BASE}/messaging/threads/${thread_id}/messages?lang=tr" \
      | python3 -c "import json,sys; m=json.load(sys.stdin).get('messages') or []; assert all('readByCounterpartyReaders' in x for x in m if x.get('senderCompanyId')) or len(m)==0"
    echo "OK: readByCounterpartyReaders alanı"
  else
    echo "SKIP: thread yok"
  fi
else
  echo "SKIP: JWT yok"
fi

echo ""
echo "FS-9 verify: PASS"
