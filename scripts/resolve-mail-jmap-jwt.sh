#!/usr/bin/env bash
# MAIL_JMAP_JWT yoksa şirket kullanıcı login (MESSAGING_TEST_* veya MAIL_JMAP_TEST_*).
set -euo pipefail

if [[ -n "${MAIL_JMAP_JWT:-}" ]] || [[ -n "${ACCESS_TOKEN:-}" ]]; then
  return 0 2>/dev/null || exit 0
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT}/.env}"
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

EMAIL="${MAIL_JMAP_TEST_EMAIL:-${MESSAGING_TEST_EMAIL:-${MAIL_TEST_EMAIL:-}}}"
PASS="${MAIL_JMAP_TEST_PASSWORD:-${MESSAGING_TEST_PASSWORD:-${MAIL_TEST_PASSWORD:-}}}"
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

export MAIL_JMAP_JWT
MAIL_JMAP_JWT="$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('accessToken',''))" <<<"${payload}")"
if [[ -z "${MAIL_JMAP_JWT}" ]]; then
  unset MAIL_JMAP_JWT
fi
