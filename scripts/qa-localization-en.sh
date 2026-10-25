#!/usr/bin/env bash
# EN UI: mail-web Playwright (local build + webServer).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}/apps/mail-web"

echo "== QA Localization (en-US) — local mail-web =="
rm -rf .next
npm run build
npx playwright install chromium 2>/dev/null | tail -2 || true
npx playwright test e2e/login-locale.spec.ts --grep "EN login"

echo "qa-localization-en: PASS"
