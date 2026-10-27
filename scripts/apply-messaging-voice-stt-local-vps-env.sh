#!/usr/bin/env bash
# STT-OSS-1: Nest API → loopback Whisper + transcribe bayrakları.
set -euo pipefail
ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
STT_URL="${MESSAGING_VOICE_STT_API_URL:-http://127.0.0.1:9010/v1/audio/transcriptions}"
STT_MODEL="${MESSAGING_VOICE_STT_MODEL:-base}"
# STT-OSS-2'de MESSAGING_VOICE_STT_API_KEY ile değişecek
STT_KEY="${LERTA_MAIL_AI_COMPOSE_API_KEY:-local-stt-internal}"

append_kv() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >>"$ENV_FILE"
  fi
}

append_kv "MESSAGING_VOICE_STT_LOCAL_ENABLED" "1"
append_kv "MESSAGING_VOICE_STT_API_URL" "${STT_URL}"
append_kv "MESSAGING_VOICE_STT_MODEL" "${STT_MODEL}"
append_kv "LERTA_MAIL_AI_COMPOSE_API_KEY" "${STT_KEY}"
append_kv "MESSAGING_VOICE_TRANSCRIBE_FAZ1" "1"
append_kv "MESSAGING_VOICE_TRANSCRIBE_ADVANCED_FAZ2" "1"
append_kv "MESSAGING_VOICE_TRANSCRIBE_AUTO_FAZ3" "1"

echo "OK: STT-OSS-1 local env → ${ENV_FILE}"
