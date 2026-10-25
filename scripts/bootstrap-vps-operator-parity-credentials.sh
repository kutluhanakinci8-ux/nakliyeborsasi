#!/usr/bin/env bash
# VPS: platform operatör (PLATFORM_OPERATOR_EMAILS) için parity JWT login — şifreyi dosyaya yaz.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT}/.env}"
OUT="${OPERATOR_PARITY_ENV:-/root/lerta-operator-parity.env}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "root ile çalıştırın." >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

EMAIL="${OPERATOR_TEST_EMAIL:-}"
if [[ -z "${EMAIL}" ]]; then
  raw="${PLATFORM_OPERATOR_EMAILS:-}"
  EMAIL="$(echo "${raw}" | tr ',' '\n' | head -1 | tr -d ' \"')"
fi
if [[ -z "${EMAIL}" ]]; then
  echo "PLATFORM_OPERATOR_EMAILS veya OPERATOR_TEST_EMAIL gerekli." >&2
  exit 1
fi

PASS="${OPERATOR_TEST_PASSWORD:-$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)}"
HASH="$(NODE_PATH="${ROOT}/node_modules" node -e "process.stdout.write(require('bcrypt').hashSync(process.argv[1], 10))" "${PASS}")"

psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c \
  "UPDATE user_accounts SET \"passwordHash\"='${HASH}' WHERE lower(\"emailAddress\")=lower('${EMAIL}');"

{
  echo "OPERATOR_TEST_EMAIL=${EMAIL}"
  echo "OPERATOR_TEST_PASSWORD=${PASS}"
} > "${OUT}"
chmod 600 "${OUT}"

echo "OK: operatör parity kimlik bilgisi → ${OUT} (${EMAIL})"
echo "Kaynak: source ${OUT} && source scripts/resolve-operator-jwt.sh"
