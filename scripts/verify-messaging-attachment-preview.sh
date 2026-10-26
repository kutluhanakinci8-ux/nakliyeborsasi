#!/usr/bin/env bash
# Görsel ek → GET .../attachments/:index/preview (JPEG, sharp).
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
TINY_PNG_B64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

threads_json="$(curl -fsS "${auth[@]}" "${API_BASE}/messaging/threads?lang=tr")"
thread_id="$(python3 -c "import json,sys; t=json.load(sys.stdin).get('threads') or []; print(t[0]['threadId'] if t else '')" <<<"${threads_json}")"
[[ -n "${thread_id}" ]] || { echo "SKIP: thread yok"; exit 0; }

marker="ATTACH_PREVIEW_$(date +%s)"
send_json="$(curl -fsS "${auth[@]}" -X POST -H "Content-Type: application/json" \
  -d "{\"bodyText\":\"${marker}\",\"attachments\":[{\"filename\":\"preview-smoke.png\",\"contentType\":\"image/png\",\"contentBase64\":\"${TINY_PNG_B64}\"}]}" \
  "${API_BASE}/messaging/threads/${thread_id}/messages?lang=tr")"
message_id="$(python3 -c "import json,sys; print(json.load(sys.stdin).get('message',{}).get('id',''))" <<<"${send_json}")"
[[ -n "${message_id}" ]] || { echo "FAIL: message id"; exit 1; }

code="$(curl -s -o /tmp/msg-preview.jpg -w "%{http_code}" "${auth[@]}" \
  "${API_BASE}/messaging/threads/${thread_id}/messages/${message_id}/attachments/0/preview?lang=tr")"
[[ "${code}" == "200" ]] || { echo "FAIL: preview HTTP ${code}"; exit 1; }
python3 -c "
p=open('/tmp/msg-preview.jpg','rb').read(4)
assert p[:2]==b'\\xff\\xd8', f'expected JPEG, got {p!r}'
print('OK: preview JPEG', len(open('/tmp/msg-preview.jpg','rb').read()), 'bytes')
"

echo "verify-messaging-attachment-preview: PASS"
