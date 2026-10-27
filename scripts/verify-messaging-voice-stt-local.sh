#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STT_HOST="${MESSAGING_VOICE_STT_LOCAL_HOST:-127.0.0.1}"
STT_PORT="${MESSAGING_VOICE_STT_LOCAL_PORT:-9010}"
STT_BASE="http://${STT_HOST}:${STT_PORT}"
STT_KEY="${MESSAGING_VOICE_STT_TEST_KEY:-local-stt-internal}"

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^lerta-messaging-local-stt$'; then
  echo "OK: container lerta-messaging-local-stt running"
else
  echo "SKIP/FAIL: lerta-messaging-local-stt container yok — bash scripts/setup-messaging-stt-local-vps.sh"
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "SKIP: ffmpeg yok — HTTP smoke atlandı"
  exit 0
fi

SAMPLE="${TMPDIR:-/tmp}/lerta-stt-sample.ogg"
ffmpeg -y -f lavfi -i "sine=frequency=440:duration=1" -ac 1 "${SAMPLE}.wav" 2>/dev/null
ffmpeg -y -i "${SAMPLE}.wav" -c:a libopus "${SAMPLE}" 2>/dev/null

code="$(curl -sS -o /tmp/lerta-stt-out.json -w "%{http_code}" -X POST \
  "${STT_BASE}/v1/audio/transcriptions" \
  -H "Authorization: Bearer ${STT_KEY}" \
  -F "file=@${SAMPLE}" \
  -F "model=base" || echo "000")"

if [[ "${code}" != "200" ]]; then
  echo "FAIL: local STT HTTP ${code}"
  head -c 300 /tmp/lerta-stt-out.json 2>/dev/null || true
  exit 1
fi

python3 -c "import json; d=json.load(open('/tmp/lerta-stt-out.json')); assert 'text' in d; print('OK: local STT text len', len(d.get('text') or ''))"

# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
status="$(curl -fsS "${API_BASE}/messaging/status")"
echo "$status" | python3 -c "
import json,sys
vn=json.load(sys.stdin).get('voiceNote') or {}
assert vn.get('sttConfigured'), 'sttConfigured false — apply-messaging-voice-stt-local-vps-env.sh + pm2 restart'
print('OK: API sttConfigured')
"
echo "verify-messaging-voice-stt-local: PASS"
