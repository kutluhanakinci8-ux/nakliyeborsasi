#!/usr/bin/env bash
# Firma sohbeti verify scriptleri için ortak JWT (login veya env).
# Kullanım: source scripts/resolve-messaging-verify-jwt.sh
set -euo pipefail

ROOT_VERIFY_JWT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-messaging-test-jwt.sh
source "${ROOT_VERIFY_JWT}/scripts/resolve-messaging-test-jwt.sh" || true

# stdout: bearer token veya boş
resolve_messaging_verify_jwt() {
  if [[ -n "${MESSAGING_TEST_JWT:-}" ]]; then
    printf '%s' "${MESSAGING_TEST_JWT}"
    return 0
  fi
  if [[ -n "${MESSAGING_SSE_JWT:-}" ]]; then
    printf '%s' "${MESSAGING_SSE_JWT}"
    return 0
  fi
  if [[ -n "${MESSAGING_FS2_JWT:-}" ]]; then
    printf '%s' "${MESSAGING_FS2_JWT}"
    return 0
  fi
  return 1
}

# Alt scriptlerin SKIP etmemesi için alias export (üst orchestrator çağırır).
export_messaging_verify_jwt_aliases() {
  local jwt=""
  jwt="$(resolve_messaging_verify_jwt)" || return 0
  export MESSAGING_SSE_JWT="${MESSAGING_SSE_JWT:-${jwt}}"
  export MESSAGING_FS2_JWT="${MESSAGING_FS2_JWT:-${jwt}}"
  export MESSAGING_FS3_JWT="${MESSAGING_FS3_JWT:-${jwt}}"
}
