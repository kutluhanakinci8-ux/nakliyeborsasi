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
if not vn.get('bridgeWaInboundFaz2Enabled'):
    print('SKIP: MESSAGING_VOICE_BRIDGE_WA_INBOUND_FAZ2=1 (ve BR-1) değil')
    sys.exit(0)
assert 'messaging_voice_bridge_wa_inbound_faz2' in set(d.get('features') or [])
print('OK: BR-2 WA inbound flag')
"
grep -q "downloadWhatsAppMedia" "${ROOT}/apps/api/src/modules/social-hub/oauth/SocialHubMetaGraphService.ts"
grep -q "resolveWhatsAppInboundAudioAttachments" "${ROOT}/apps/api/src/modules/social-hub/oauth/SocialHubWebhookIngestService.ts"
grep -q "extractWhatsAppInboundAudio" "${ROOT}/apps/api/src/modules/social-hub/oauth/SocialHubMetaWebhookParser.ts"
echo "OK: BR-2 sources"
