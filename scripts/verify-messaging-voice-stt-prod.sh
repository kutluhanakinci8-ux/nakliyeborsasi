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
print('transcribeFaz1', vn.get('transcribeFaz1Enabled'))
print('sttConfigured', vn.get('sttConfigured'))
if not vn.get('sttConfigured'):
    print('FAIL: STT yapılandırılmamış — VPS .env içine LERTA_MAIL_AI_COMPOSE_API_KEY ekleyin')
    print('      bash scripts/apply-messaging-voice-stt-vps-env.sh && pm2 restart nakliyeborsasi-api --update-env')
    sys.exit(1)
print('OK: voice STT configured')
"
