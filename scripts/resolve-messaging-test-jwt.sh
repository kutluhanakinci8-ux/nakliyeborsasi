#!/usr/bin/env bash
# JWT yoksa MESSAGING_TEST_EMAIL/PASSWORD ile login dener; export MESSAGING_TEST_JWT.
# Kullanım: source scripts/resolve-messaging-test-jwt.sh  (verify scriptleri içinden)
set -euo pipefail

if [[ -n "${MESSAGING_TEST_JWT:-}" ]] || [[ -n "${MESSAGING_SSE_JWT:-}" ]]; then
  return 0 2>/dev/null || exit 0
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT}/.env}"
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
fi

EMAIL="${MESSAGING_TEST_EMAIL:-}"
PASS="${MESSAGING_TEST_PASSWORD:-}"
if [[ -z "${EMAIL}" || -z "${PASS}" ]]; then
  return 0 2>/dev/null || exit 0
fi

# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

export EMAIL PASS
login_body="$(python3 -c "import json,os; print(json.dumps({'emailAddress':os.environ['EMAIL'],'password':os.environ['PASS']}))")"
payload="$(curl -fsS -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "${login_body}" 2>/dev/null || true)"

if [[ -z "${payload}" ]]; then
  return 0 2>/dev/null || exit 0
fi

export MESSAGING_TEST_JWT
MESSAGING_TEST_JWT="$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('accessToken',''))" <<<"${payload}")"
if [[ -z "${MESSAGING_TEST_JWT}" ]]; then
  unset MESSAGING_TEST_JWT
  return 0 2>/dev/null || exit 0
fi
