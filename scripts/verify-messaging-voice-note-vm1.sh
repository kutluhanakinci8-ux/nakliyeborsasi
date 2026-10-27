#!/usr/bin/env bash
# VM-1: sesli mesaj API + feature flag
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
if not vn.get('faz1Enabled'):
    print('SKIP: MESSAGING_VOICE_NOTE_FAZ1=1 değil (yerel/VPS env)')
    sys.exit(0)
assert 'messaging_voice_note_faz1' in feats, 'feature flag eksik'
assert vn.get('maxDurationMs', 0) >= 5000
print('OK: messaging voice note VM-1 status')
"

grep -q "messagingVoiceNoteFaz1Enabled" "${ROOT}/apps/api/src/modules/messaging/messagingVoiceNoteConfig.ts"
grep -q "MessagingVoiceNoteComposeButton" "${ROOT}/apps/web/src/components/messaging/MessagingVoiceNoteComposeButton.tsx"
echo "OK: voice note VM-1 sources"
