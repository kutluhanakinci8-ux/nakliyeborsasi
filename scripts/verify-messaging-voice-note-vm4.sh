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
if not vn.get('deeplinkFaz4Enabled'):
    print('SKIP: MESSAGING_VOICE_NOTE_DEEPLINK_FAZ4=1 değil')
    sys.exit(0)
assert 'messaging_voice_note_deeplink_faz4' in set(d.get('features') or [])
print('OK: VM-4 voice note deeplink flag')
"
grep -q "messagingVoiceNoteDeepLink" "${ROOT}/apps/web/src/lib/messagingVoiceNoteDeepLink.ts"
grep -q "highlightFromDeepLink" "${ROOT}/apps/web/src/components/messaging/MessagingVoiceNoteComposeButton.tsx"
echo "OK: VM-4 sources"
