#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

status="$(curl -fsS "${API_BASE}/messaging/status")"
echo "$status" | python3 -c "
import json,sys
d=json.load(sys.stdin)
feats=set(d.get('features') or [])
vn=d.get('voiceNote') or {}
if not vn.get('transcribeFaz1Enabled'):
    print('SKIP: MESSAGING_VOICE_TRANSCRIBE_FAZ1=1 değil')
    sys.exit(0)
assert 'messaging_voice_transcribe_manual_faz1' in feats
print('OK: voice transcribe STT-1 status flag')
"

grep -q "MessagingVoiceTranscribeService" "${ROOT}/apps/api/src/modules/messaging/MessagingVoiceTranscribeService.ts"
grep -q "transcribeVoiceAttachment" "${ROOT}/apps/web/src/lib/MessagingApiClient.ts"
echo "OK: STT-1 sources"
