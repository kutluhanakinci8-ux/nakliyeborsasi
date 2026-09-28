#!/usr/bin/env bash
# JWT ile messaging status + channels + search smoke.
set -euo pipefail
TOKEN="${ACCESS_TOKEN:-${MAIL_JMAP_JWT:-}}"
API_BASE="${API_BASE:-https://app.lerta.com.tr/api/v1}"
if [[ -z "${TOKEN}" ]]; then
  echo "ACCESS_TOKEN gerekli." >&2
  exit 1
fi
STATUS="$(curl -fsS -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/messaging/status")"
echo "${STATUS}" | node -e "
const s=JSON.parse(require('fs').readFileSync(0,'utf8'));
const f=s.features||[];
const need=['org_channels','enterprise_search','incoming_bot_webhook'];
for (const k of need) {
  if(!f.includes(k)){ console.error('NOT: feature', k); process.exit(2); }
}
console.log('OK: messaging/status features');
"
CH="$(curl -fsS -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/messaging/channels")"
echo "${CH}" | node -e "
const p=JSON.parse(require('fs').readFileSync(0,'utf8'));
const n=(p.channels||[]).length;
if(n<1){console.error('NOT: channels empty');process.exit(3);}
console.log('OK: channels', n);
"
