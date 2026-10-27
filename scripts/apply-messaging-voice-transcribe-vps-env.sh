#!/usr/bin/env bash
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
echo "OK: MESSAGING_VOICE_TRANSCRIBE_FAZ1=1 → $ENV_FILE"
