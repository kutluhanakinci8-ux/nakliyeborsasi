#!/usr/bin/env bash
# Excellence demo verisi + doğrulama (VPS veya lokal API).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"

export TEST_MARKET_PASSWORD="${TEST_MARKET_PASSWORD:-TestPass123!}"

echo "== Excellence seed (API: ${API_BASE}) =="
bash "${ROOT}/scripts/seed-firma-sohbeti-excellence-showcase.sh"

echo ""
echo "== Excellence verify =="
export MESSAGING_TEST_EMAIL="${MESSAGING_EXCELLENCE_SEED_EMAIL:-yukveren01@test.nakliyeborsasi.local}"
export MESSAGING_TEST_PASSWORD="${MESSAGING_EXCELLENCE_SEED_PASSWORD:-${TEST_MARKET_PASSWORD}}"
unset MESSAGING_TEST_JWT MESSAGING_SSE_JWT
bash "${ROOT}/scripts/verify-firma-sohbeti-excellence-showcase.sh"

echo ""
echo "OK: messaging excellence seed + verify"
