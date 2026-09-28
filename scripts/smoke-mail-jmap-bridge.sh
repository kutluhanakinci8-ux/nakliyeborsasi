#!/usr/bin/env bash
# JWT ile JMAP session + Email/query smoke.
set -euo pipefail
TOKEN="${MAIL_JMAP_JWT:-${ACCESS_TOKEN:-}}"
API_BASE="${API_BASE:-https://app.lerta.com.tr/api/v1}"
if [[ -z "${TOKEN}" ]]; then
  echo "MAIL_JMAP_JWT veya ACCESS_TOKEN gerekli." >&2
  exit 1
fi
SESSION="$(curl -fsS -H "Authorization: Bearer ${TOKEN}" "${API_BASE}/company/mail-jmap/session")"
echo "session: OK"
ORG_ID="$(echo "${SESSION}" | node -e "const s=JSON.parse(require('fs').readFileSync(0,'utf8')); const k=Object.keys(s.accounts||{})[0]; process.stdout.write(k||'');")"
if [[ -z "${ORG_ID}" ]]; then
  echo "NOT: accountId bulunamadı" >&2
  exit 2
fi
BODY="$(node -e "
const org='${ORG_ID}';
process.stdout.write(JSON.stringify({
  using: ['urn:ietf:params:jmap:core','urn:ietf:params:jmap:mail'],
  methodCalls: [['Email/query',{accountId:org,filter:{inMailbox:'inbox'},limit:5},'q1']]
}));
")"
RESP="$(curl -fsS -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  -d "${BODY}" "${API_BASE}/company/mail-jmap")"
echo "${RESP}" | node -e "
const r=JSON.parse(require('fs').readFileSync(0,'utf8'));
const calls=r.methodResponses||[];
const ok=calls.some(c=>Array.isArray(c)&&c[0]==='Email/query'&&c[1]?.ids);
if(!ok){console.error('NOT: Email/query yanıtı eksik');process.exit(3);}
console.log('OK: Email/query', (calls.find(c=>c[0]==='Email/query')[1].ids||[]).length, 'id');
"
