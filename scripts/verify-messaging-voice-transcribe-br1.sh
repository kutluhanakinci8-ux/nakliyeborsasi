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
if not vn.get('bridgeSttFaz1Enabled'):
    print('SKIP: MESSAGING_VOICE_BRIDGE_STT_FAZ1=1 değil')
    sys.exit(0)
assert 'messaging_voice_bridge_stt_faz1' in set(d.get('features') or [])
print('OK: BR-1 bridge STT flag')
"
grep -q "maybeAutoTranscribeBridgeInbound" "${ROOT}/apps/api/src/modules/messaging/MessagingVoiceTranscribeService.ts"
grep -q "sendWhatsAppAudio" "${ROOT}/apps/api/src/modules/social-hub/oauth/SocialHubMetaGraphService.ts"
echo "OK: BR-1 sources"
