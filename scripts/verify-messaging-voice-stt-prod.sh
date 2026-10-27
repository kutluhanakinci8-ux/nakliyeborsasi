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
print('sttProvider', vn.get('sttProvider'))
if not vn.get('sttConfigured'):
    print('FAIL: STT yapılandırılmamış')
    print('      bash scripts/apply-messaging-voice-stt-local-vps-env.sh')
    print('      bash scripts/setup-messaging-stt-local-vps.sh')
    print('      pm2 restart nakliyeborsasi-api --update-env')
    sys.exit(1)
if vn.get('sttProvider') == 'unconfigured':
    sys.exit('FAIL: sttProvider unconfigured')
print('OK: voice STT configured (OSS self-hosted veya cloud)')
"
