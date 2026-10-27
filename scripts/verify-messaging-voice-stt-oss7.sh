#!/usr/bin/env bash
# STT-OSS-7: gate wrapper + doc sources.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
grep -q "messaging_voice_stt_oss_gate_faz7" "${ROOT}/apps/api/src/modules/messaging/MessagingModuleStatusController.ts"
grep -q "MESSAGING_VOICE_STT_OSS_GATE_FAZ7" "${ROOT}/apps/api/src/modules/messaging/messagingVoiceTranscribeConfig.ts"
test -x "${ROOT}/scripts/verify-messaging-voice-stt-oss-gate.sh"
bash "${ROOT}/scripts/verify-messaging-voice-stt-oss-gate.sh"
