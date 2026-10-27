#!/usr/bin/env bash
# STT-OSS-1: Nest API → loopback Whisper + transcribe bayrakları.
set -euo pipefail
ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
STT_URL="${MESSAGING_VOICE_STT_API_URL:-http://127.0.0.1:9010/asr}"
STT_MODEL="${MESSAGING_VOICE_STT_MODEL:-base}"
# STT-OSS-2'de MESSAGING_VOICE_STT_API_KEY ile değişecek
STT_KEY="${MESSAGING_VOICE_STT_API_KEY:-local-stt-internal}"

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
append_kv "MESSAGING_VOICE_STT_LOCAL_FAZ1" "1"
append_kv "MESSAGING_VOICE_STT_AUTH_OPTIONAL" "1"
append_kv "MESSAGING_VOICE_STT_API_URL" "${STT_URL}"
append_kv "MESSAGING_VOICE_STT_MODEL" "${STT_MODEL}"
append_kv "MESSAGING_VOICE_STT_API_KEY" "${STT_KEY}"
append_kv "MESSAGING_VOICE_TRANSCRIBE_FAZ1" "1"
append_kv "MESSAGING_VOICE_TRANSCRIBE_ADVANCED_FAZ2" "1"
append_kv "MESSAGING_VOICE_TRANSCRIBE_AUTO_FAZ3" "1"
# STT-OSS-3: TR varsayılan dil + glossary (repo data dosyası VPS yoluna kopyalanır)
GLOSSARY_PATH="${MESSAGING_VOICE_STT_GLOSSARY_PATH:-/var/www/nakliyeborsasi/data/messaging/voice-stt-glossary-tr.json}"
append_kv "MESSAGING_VOICE_STT_DEFAULT_LANGUAGE" "tr"
append_kv "MESSAGING_VOICE_STT_GLOSSARY_PATH" "${GLOSSARY_PATH}"
append_kv "MESSAGING_VOICE_STT_TR_QUALITY_FAZ1" "1"
append_kv "MESSAGING_VOICE_STT_MAX_CONCURRENT" "${MESSAGING_VOICE_STT_MAX_CONCURRENT:-2}"
append_kv "MESSAGING_VOICE_STT_RELIABILITY_FAZ1" "1"
append_kv "MESSAGING_VOICE_STT_OSS_GATE_FAZ7" "1"

echo "OK: STT-OSS-1/3/4/7 local env → ${ENV_FILE}"
