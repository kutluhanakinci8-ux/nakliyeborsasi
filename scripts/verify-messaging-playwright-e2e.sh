#!/usr/bin/env bash
# MP-3: Playwright smoke — public login + (opsiyonel) JWT ile hub şeridi.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

npm run build -w @nakliyeborsasi/web
npm run test:e2e:install -w @nakliyeborsasi/web

export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:3011}"

if [[ "${PLAYWRIGHT_SKIP_WEB_SERVER:-}" != "1" ]]; then
  npm run test:e2e -w @nakliyeborsasi/web -- --grep "login sayfası|korumalı"
else
  npm run test:e2e -w @nakliyeborsasi/web
fi

echo "OK: messaging Playwright e2e smoke"
