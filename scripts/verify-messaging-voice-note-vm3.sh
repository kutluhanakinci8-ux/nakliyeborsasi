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
if not vn.get('mobileFaz3Enabled'):
    print('SKIP: MESSAGING_VOICE_NOTE_MOBILE_FAZ3=1 değil')
    sys.exit(0)
assert 'messaging_voice_note_mobile_faz3' in set(d.get('features') or [])
print('OK: VM-3 mobile voice note flag')
"
grep -q "MessagingVoiceNoteMobilePanel" "${ROOT}/apps/mobile/src/MessagingVoiceNoteMobilePanel.tsx"
grep -q "hasVoiceNote" "${ROOT}/apps/api/src/modules/messaging/MessagingExpoPushService.ts"
echo "OK: VM-3 sources"
