#!/usr/bin/env bash
# Mesajlaşma CRUD smoke: threads list, send message, entitlement 403 (opsiyonel).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
# shellcheck source=scripts/resolve-messaging-verify-jwt.sh
source "${ROOT}/scripts/resolve-messaging-verify-jwt.sh" || true

JWT="$(resolve_messaging_verify_jwt 2>/dev/null || true)"
if [[ -z "${JWT}" ]]; then
  echo "SKIP: messaging verify JWT yok"
  exit 0
fi

auth=(-H "Authorization: Bearer ${JWT}")

echo "== GET threads =="
threads_json="$(curl -fsS "${auth[@]}" "${API_BASE}/messaging/threads?lang=tr")"
thread_id="$(python3 -c "import json,sys; t=json.load(sys.stdin).get('threads') or []; print(t[0]['threadId'] if t else '')" <<<"${threads_json}")"
if [[ -z "${thread_id}" ]]; then
  echo "SKIP: thread yok — seed veya open thread gerekli"
  exit 0
fi
echo "OK: thread ${thread_id}"

marker="E2E_API_SMOKE_$(date +%s)"
echo "== POST message =="
send_json="$(curl -fsS "${auth[@]}" -X POST \
  -H "Content-Type: application/json" \
  -d "{\"bodyText\":\"${marker}\"}" \
  "${API_BASE}/messaging/threads/${thread_id}/messages?lang=tr")"
python3 -c "import json,sys; m=json.load(sys.stdin).get('message') or {}; assert m.get('id'); print('OK: message', m['id'][:8])" <<<"${send_json}"

echo "== GET messages (contains marker) =="
msgs_json="$(curl -fsS "${auth[@]}" \
  "${API_BASE}/messaging/threads/${thread_id}/messages?limit=20&lang=tr")"
python3 -c "
import json, sys
marker = '''${marker}'''
msgs = json.load(sys.stdin).get('messages') or []
assert any(marker in (m.get('bodyText') or '') for m in msgs), 'marker not in messages'
print('OK: marker in thread')
" <<<"${msgs_json}"

blocked_email="${MESSAGING_ENTITLEMENT_DENIED_TEST_EMAIL:-}"
blocked_pass="${MESSAGING_ENTITLEMENT_DENIED_TEST_PASSWORD:-}"
if [[ -n "${blocked_email}" && -n "${blocked_pass}" ]]; then
  echo "== entitlement 403 smoke =="
  login_body="$(python3 -c "import json,os; print(json.dumps({'emailAddress':os.environ['E'],'password':os.environ['P']}))")"
  E="${blocked_email}" P="${blocked_pass}" \
    code="$(curl -s -o /tmp/messaging-403.json -w "%{http_code}" -X POST \
      "${API_BASE}/auth/login" -H "Content-Type: application/json" -d "${login_body}")"
  if [[ "${code}" != "201" ]]; then
    echo "SKIP: blocked test login HTTP ${code}"
  else
    blocked_jwt="$(python3 -c "import json; print(json.load(open('/tmp/messaging-403.json'))['accessToken'])")"
    code="$(curl -s -o /tmp/messaging-threads-403.json -w "%{http_code}" \
      -H "Authorization: Bearer ${blocked_jwt}" \
      "${API_BASE}/messaging/threads?lang=tr")"
    [[ "${code}" == "403" ]] || { echo "FAIL: expected 403 got ${code}"; exit 1; }
    grep -q "SUBSCRIPTION_ENTITLEMENT_DENIED" /tmp/messaging-threads-403.json
    echo "OK: SUBSCRIPTION_ENTITLEMENT_DENIED for ${blocked_email}"
  fi
fi

echo "verify-messaging-thread-api-smoke: PASS"
