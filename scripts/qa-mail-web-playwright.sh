#!/usr/bin/env bash
# mail-web Playwright: VPS'te canlı posta; agent'ta local build + webServer.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}/apps/mail-web"

use_prod="${QA_MAIL_WEB_PLAYWRIGHT_PROD:-auto}"
if [[ "${use_prod}" == "auto" ]]; then
  if [[ -f /var/www/nakliyeborsasi/.env ]] \
    && curl -fsS --connect-timeout 5 --max-time 10 "https://posta.lerta.com.tr/login" >/dev/null 2>&1; then
    use_prod=1
  else
    use_prod=0
  fi
fi

npx playwright install chromium 2>/dev/null | tail -2 || true

if [[ "${use_prod}" == "1" ]]; then
  echo "== mail-web Playwright (prod ${PLAYWRIGHT_BASE_URL:-https://posta.lerta.com.tr}) =="
  export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-https://posta.lerta.com.tr}"
  export PLAYWRIGHT_SKIP_WEB_SERVER=1
  npx playwright test "$@"
else
  echo "== mail-web Playwright (local build) =="
  rm -rf .next
  npm run build
  npx playwright test "$@"
fi
