#!/usr/bin/env bash
# OPERATOR_JWT yoksa .env içindeki OPERATOR_TEST_EMAIL/PASSWORD ile platform admin login.
# Kullanım: source scripts/resolve-operator-jwt.sh
set -euo pipefail

if [[ -n "${OPERATOR_JWT:-}" ]]; then
  case "${OPERATOR_JWT}" in
    *"<platform-admin-jwt>"* | *"<jwt>"* | *"eyJ…"*)
      echo "NOT: OPERATOR_JWT placeholder — gerçek JWT veya .env OPERATOR_TEST_EMAIL/PASSWORD kullanın" >&2
      unset OPERATOR_JWT
      ;;
  esac
fi

if [[ -n "${OPERATOR_JWT:-}" ]]; then
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

EMAIL="${OPERATOR_TEST_EMAIL:-${PLATFORM_OPERATOR_EMAIL:-}}"
PASS="${OPERATOR_TEST_PASSWORD:-${PLATFORM_OPERATOR_PASSWORD:-}}"
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

export OPERATOR_JWT
OPERATOR_JWT="$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('accessToken',''))" <<<"${payload}")"
if [[ -z "${OPERATOR_JWT}" ]]; then
  unset OPERATOR_JWT
fi
