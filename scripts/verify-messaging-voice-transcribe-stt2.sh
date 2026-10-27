#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

status="$(curl -fsS "${API_BASE}/messaging/status")"
echo "$status" | python3 -c "
import json,sys
d=json.load(sys.stdin)
vn=d.get('voiceNote') or {}
if not vn.get('transcribeAdvancedFaz2Enabled'):
    print('SKIP: MESSAGING_VOICE_TRANSCRIBE_ADVANCED_FAZ2=1 değil')
    sys.exit(0)
assert 'messaging_voice_transcribe_advanced_faz2' in set(d.get('features') or [])
print('OK: STT-2 advanced flag')
"
grep -q "editTranscript" "${ROOT}/apps/api/src/modules/messaging/MessagingVoiceTranscribeService.ts"
echo "OK: STT-2 sources"
