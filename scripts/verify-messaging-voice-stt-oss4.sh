#!/usr/bin/env bash
# STT-OSS-4: health endpoint, concurrency config, reliability feature.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

grep -q "MESSAGING_VOICE_STT_MAX_CONCURRENT" "${ROOT}/apps/api/src/modules/messaging/messagingVoiceTranscribeConfig.ts"
grep -q "withMessagingVoiceSttSlot" "${ROOT}/apps/api/src/modules/messaging/MessagingVoiceTranscribeService.ts"
grep -q "MessagingVoiceSttHealthController" "${ROOT}/apps/api/src/modules/messaging/MessagingModule.ts"

health="$(curl -fsS "${API_BASE}/messaging/integration/voice-stt/health")"
echo "$health" | python3 -c "
import json,sys
d=json.load(sys.stdin)
assert 'configured' in d and 'reachable' in d
assert 'maxConcurrent' in d and 'activeJobs' in d
print('OK: health', {k:d.get(k) for k in ('configured','reachable','provider','maxConcurrent','latencyMs')})
"

status="$(curl -fsS "${API_BASE}/messaging/status")"
echo "$status" | python3 -c "
import json,sys
d=json.load(sys.stdin)
vn=d.get('voiceNote') or {}
feats=set(d.get('features') or [])
if vn.get('sttReliabilityFaz1Enabled'):
    assert 'messaging_voice_stt_reliability_faz1' in feats
    assert (vn.get('sttMaxConcurrent') or 0) >= 1
print('OK: voiceNote reliability', vn.get('sttMaxConcurrent'), vn.get('sttReliabilityFaz1Enabled'))
"

echo "verify-messaging-voice-stt-oss4: PASS"
