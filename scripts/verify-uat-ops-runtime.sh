#!/usr/bin/env bash
# UAT ops — VPS ortamında tam parity (ENV_FILE, OPERATOR_JWT, IMAP).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
if [[ ! -f "${ENV_FILE}" && -f "${ROOT}/.env" ]]; then
  ENV_FILE="${ROOT}/.env"
fi

FAIL=0
need() {
  if [[ -z "${2:-}" ]]; then
    echo "MISSING: $1"
    FAIL=1
  else
    echo "OK: $1"
  fi
}

echo "== UAT ops runtime verify =="
[[ -f "${ENV_FILE}" ]] && echo "OK: ENV_FILE ${ENV_FILE}" || { echo "MISSING: ENV_FILE"; FAIL=1; }

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

need "OPERATOR_JWT" "${OPERATOR_JWT:-}"
need "GOOGLE_OAUTH_CLIENT_ID" "${GOOGLE_OAUTH_CLIENT_ID:-${GMAIL_OAUTH_CLIENT_ID:-}}"
need "AZURE_AD_CLIENT_ID" "${AZURE_AD_CLIENT_ID:-${EXCHANGE_OAUTH_CLIENT_ID:-}}"

if [[ -x "${ROOT}/scripts/verify-uat-oauth-env.sh" ]] && [[ -f "${ENV_FILE}" ]]; then
  bash "${ROOT}/scripts/verify-uat-oauth-env.sh" || FAIL=1
fi

if [[ -n "${OPERATOR_JWT:-}" ]]; then
  bash "${ROOT}/scripts/run-mail-billing-a1-acceptance.sh" || FAIL=1
fi

if [[ "${FAIL}" -eq 0 ]]; then
  echo "verify-uat-ops-runtime: PASS"
  exit 0
fi
echo "verify-uat-ops-runtime: FAIL (docs/CUSTOMER_READY_GATE.md)" >&2
exit 1
