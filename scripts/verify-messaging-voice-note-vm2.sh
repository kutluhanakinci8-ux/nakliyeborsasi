#!/usr/bin/env bash
# VM-2: sesli mesaj oynatıcı (1x / 1.5x)
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
if not vn.get('playerFaz2Enabled'):
    print('SKIP: MESSAGING_VOICE_NOTE_PLAYER_FAZ2=1 değil')
    sys.exit(0)
assert 'messaging_voice_note_player_faz2' in feats
print('OK: messaging voice note VM-2 player flag')
"

grep -q "chat-voice-note-rate" "${ROOT}/apps/web/src/app/globals.css"
grep -q "MessagingVoiceNotePlayer" "${ROOT}/apps/web/src/components/messaging/MessagingVoiceNotePlayer.tsx"
echo "OK: voice note VM-2 sources"
