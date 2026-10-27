#!/usr/bin/env bash
# WhatsApp outbound voice: webm → ogg transcode path (Meta #100 MIME).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
grep -q "prepareWhatsAppOutboundAudio" "${ROOT}/apps/api/src/modules/social-hub/oauth/SocialHubMetaGraphService.ts"
grep -q 'form.append("type", "audio")' "${ROOT}/apps/api/src/modules/social-hub/oauth/SocialHubMetaGraphService.ts"
grep -q "WHATSAPP_CLOUD_ALLOWED_AUDIO_MIME" "${ROOT}/apps/api/src/modules/social-hub/oauth/socialHubWhatsAppOutboundAudio.ts"
test -x "${ROOT}/scripts/ensure-vps-ffmpeg.sh"
grep -q "audio/ogg;codecs=opus" "${ROOT}/apps/web/src/lib/messagingVoiceNoteBlob.ts"
bash "${ROOT}/scripts/verify-messaging-voice-json-body-limit.sh"
cd "${ROOT}/apps/api" && npm test -- --run socialHubWhatsAppOutboundAudio 2>&1 | tail -5
echo "verify-messaging-whatsapp-voice-outbound: PASS"
