#!/usr/bin/env bash
# MP-3: Playwright smoke — public login + (opsiyonel) JWT ile hub şeridi.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

# Opsiyonel: MESSAGING_TEST_EMAIL/PASSWORD → E2E_ACCESS_TOKEN
# shellcheck source=scripts/resolve-messaging-verify-jwt.sh
source "${ROOT}/scripts/resolve-messaging-verify-jwt.sh" || true
if [[ -z "${E2E_ACCESS_TOKEN:-}" ]]; then
  jwt="$(resolve_messaging_verify_jwt 2>/dev/null || true)"
  if [[ -n "${jwt}" ]]; then
    export E2E_ACCESS_TOKEN="${jwt}"
  fi
fi

npm run build -w @nakliyeborsasi/web
npm run test:e2e:install -w @nakliyeborsasi/web

export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:3011}"

if [[ "${PLAYWRIGHT_SKIP_WEB_SERVER:-}" != "1" ]]; then
  if [[ -n "${E2E_ACCESS_TOKEN:-}" ]]; then
    npm run test:e2e -w @nakliyeborsasi/web -- --grep "Mesajlar hub"
  else
    npm run test:e2e -w @nakliyeborsasi/web -- --grep "login sayfası|korumalı"
  fi
else
  npm run test:e2e -w @nakliyeborsasi/web
fi

echo "OK: messaging Playwright e2e smoke"
