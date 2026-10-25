#!/usr/bin/env bash
# Faz 6B önkoşul taraması — secret yazdırmaz; eksikleri listeler.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${INSTALL_DIR:-${ROOT}}/.env}"

missing=()
warn=()

need_env_file() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    missing+=("ENV_FILE (${ENV_FILE} dosyası yok)")
    return 1
  fi
  echo "OK: ENV_FILE=${ENV_FILE}"
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
  return 0
}

need_var() {
  local name="$1"
  local label="${2:-$1}"
  if [[ -n "${!name:-}" ]]; then
    echo "OK: ${label}"
    return 0
  fi
  missing+=("${label}")
  return 1
}

need_grep_key() {
  local key="$1"
  if grep -qE "^${key}=.+" "${ENV_FILE}" 2>/dev/null; then
    echo "OK: ${key} (.env)"
    return 0
  fi
  missing+=("${key} (.env)")
  return 1
}

echo "== Faz 6B UAT ops önkoşullar =="

if need_env_file; then
  # shellcheck source=scripts/resolve-operator-jwt.sh
  source "${ROOT}/scripts/resolve-operator-jwt.sh" || true
  need_var OPERATOR_JWT "OPERATOR_JWT (veya OPERATOR_TEST_EMAIL/PASSWORD)"
  need_grep_key GOOGLE_GMAIL_CLIENT_ID
  need_grep_key MICROSOFT_GRAPH_MAIL_CLIENT_ID
  need_grep_key MAIL_WEB_PUSH_VAPID_PUBLIC_KEY
  need_grep_key MAIL_WEB_PUSH_VAPID_PRIVATE_KEY
else
  warn+=("Repo köküne VPS .env kopyala veya ENV_FILE ayarla")
fi

if [[ ! -x "${ROOT}/scripts/smoke-imap-gold.sh" ]]; then
  warn+=("smoke-imap-gold.sh yok")
fi

if [[ "${#missing[@]}" -gt 0 ]]; then
  echo ""
  echo "Eksik (${#missing[@]}):"
  printf '  - %s\n' "${missing[@]}"
fi
if [[ "${#warn[@]}" -gt 0 ]]; then
  echo ""
  echo "Uyarı:"
  printf '  - %s\n' "${warn[@]}"
fi

if [[ "${#missing[@]}" -eq 0 ]]; then
  echo ""
  echo "verify-uat-ops-prereqs: READY"
  exit 0
fi
echo ""
echo "verify-uat-ops-prereqs: NOT_READY (docs/UAT_FAZ6_OPS_RUNBOOK.md)" >&2
exit 1
