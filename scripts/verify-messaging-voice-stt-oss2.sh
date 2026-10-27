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
assert vn.get('sttProvider') in ('local','openai','unconfigured')
if vn.get('sttConfigured'):
    assert 'messaging_voice_stt_local_faz1' in set(d.get('features') or []) or vn.get('sttProvider')=='openai'
print('OK: sttProvider', vn.get('sttProvider'))
"
grep -q "MESSAGING_VOICE_STT_API_KEY" "${ROOT}/apps/api/src/modules/messaging/messagingVoiceTranscribeConfig.ts"
echo "OK: STT-OSS-2 sources"
