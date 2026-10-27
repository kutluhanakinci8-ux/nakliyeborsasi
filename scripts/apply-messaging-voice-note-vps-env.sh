#!/usr/bin/env bash
# U88 VPS: sesli mesaj faz bayrakları (.env append, idempotent)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
PHASE="${1:-all}"

append_kv() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >>"$ENV_FILE"
  fi
}

case "$PHASE" in
  vm1)
    append_kv "MESSAGING_VOICE_NOTE_FAZ1" "1"
    ;;
  vm2)
    append_kv "MESSAGING_VOICE_NOTE_PLAYER_FAZ2" "1"
    ;;
  vm3)
    append_kv "MESSAGING_VOICE_NOTE_MOBILE_FAZ3" "1"
    ;;
  all)
    append_kv "MESSAGING_VOICE_NOTE_FAZ1" "1"
    append_kv "MESSAGING_VOICE_NOTE_PLAYER_FAZ2" "1"
    append_kv "MESSAGING_VOICE_NOTE_MOBILE_FAZ3" "1"
    ;;
  *)
    echo "Kullanım: $0 [vm1|vm2|vm3|all]" >&2
    exit 1
    ;;
esac

echo "OK: voice note env ($PHASE) → $ENV_FILE"
