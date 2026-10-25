#!/usr/bin/env bash
# EN UI: mail-web Playwright (local build + webServer).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== QA Localization (en-US) — mail-web =="
bash "${ROOT}/scripts/qa-mail-web-playwright.sh" e2e/login-locale.spec.ts --grep "EN login"

echo "qa-localization-en: PASS"
