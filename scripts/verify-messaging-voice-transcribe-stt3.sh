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
if not vn.get('transcribeAutoFaz3Enabled'):
    print('SKIP: MESSAGING_VOICE_TRANSCRIBE_AUTO_FAZ3=1 değil')
    sys.exit(0)
assert 'messaging_voice_transcribe_auto_faz3' in set(d.get('features') or [])
print('OK: STT-3 auto flag')
"
grep -q "maybeAutoTranscribeAfterSend" "${ROOT}/apps/api/src/modules/messaging/MessagingVoiceTranscribeService.ts"
grep -q "voice-transcribe" "${ROOT}/apps/api/src/modules/messaging/MessagingIntegrationController.ts"
echo "OK: STT-3 sources"
