#!/usr/bin/env bash
# STT-OSS-3: TR default language, glossary, bridge STT wiring.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

test -f "${ROOT}/data/messaging/voice-stt-glossary-tr.json"
grep -q "MESSAGING_VOICE_STT_DEFAULT_LANGUAGE" "${ROOT}/apps/api/src/modules/messaging/messagingVoiceTranscribeConfig.ts"
grep -q "messagingVoiceSttTrQualityFaz1Enabled" "${ROOT}/apps/api/src/modules/messaging/messagingVoiceTranscribeConfig.ts"
grep -q "loadFileGlossaryRules" "${ROOT}/apps/api/src/modules/messaging/messagingVoiceSttGlossary.ts"
grep -q "transcriptSource: \"bridge_inbound\"" "${ROOT}/apps/api/src/modules/messaging/MessagingVoiceTranscribeService.ts"

status="$(curl -fsS "${API_BASE}/messaging/status")"
echo "$status" | python3 -c "
import json,sys
d=json.load(sys.stdin)
vn=d.get('voiceNote') or {}
feats=set(d.get('features') or [])
if vn.get('sttTrQualityFaz1Enabled'):
    assert 'messaging_voice_stt_tr_quality_faz1' in feats
    assert vn.get('sttDefaultLanguage')=='tr'
    assert (vn.get('sttGlossaryRuleCount') or 0) >= 6
print('OK: voiceNote', {k: vn.get(k) for k in ('sttDefaultLanguage','sttGlossaryRuleCount','sttTrQualityFaz1Enabled','bridgeSttFaz1Enabled')})
"

bash "${ROOT}/scripts/verify-messaging-voice-transcribe-br1.sh"
echo "verify-messaging-voice-stt-oss3: PASS"
