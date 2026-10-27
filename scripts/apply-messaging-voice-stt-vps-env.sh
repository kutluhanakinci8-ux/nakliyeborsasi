#!/usr/bin/env bash
# STT (ses → metin): bayraklar + isteğe bağlı OpenAI/Whisper anahtarı (.env).
# Anahtar: ortam değişkeni LERTA_MAIL_AI_COMPOSE_API_KEY (deploy sırasında) veya sunucuda elle.
set -euo pipefail
ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
append_kv() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >>"$ENV_FILE"
  fi
}

append_kv "MESSAGING_VOICE_TRANSCRIBE_FAZ1" "1"
append_kv "MESSAGING_VOICE_TRANSCRIBE_ADVANCED_FAZ2" "1"
append_kv "MESSAGING_VOICE_TRANSCRIBE_AUTO_FAZ3" "1"
append_kv "LERTA_MAIL_AI_COMPOSE_ENABLED" "true"

if [[ -n "${LERTA_MAIL_AI_COMPOSE_API_KEY:-}" ]]; then
  append_kv "LERTA_MAIL_AI_COMPOSE_API_KEY" "${LERTA_MAIL_AI_COMPOSE_API_KEY}"
  echo "OK: LERTA_MAIL_AI_COMPOSE_API_KEY yazıldı"
else
  echo "UYARI: LERTA_MAIL_AI_COMPOSE_API_KEY boş — /messaging/status voiceNote.sttConfigured=false kalır"
fi

if [[ -n "${MESSAGING_VOICE_STT_API_URL:-}" ]]; then
  append_kv "MESSAGING_VOICE_STT_API_URL" "${MESSAGING_VOICE_STT_API_URL}"
fi
if [[ -n "${MESSAGING_VOICE_STT_MODEL:-}" ]]; then
  append_kv "MESSAGING_VOICE_STT_MODEL" "${MESSAGING_VOICE_STT_MODEL}"
fi

echo "OK: voice STT env flags → ${ENV_FILE}"
