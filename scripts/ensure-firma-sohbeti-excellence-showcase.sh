#!/usr/bin/env bash
# Showcase verify başarısızsa idempotent seed dener (FORCE yok).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
# shellcheck source=scripts/resolve-messaging-test-jwt.sh
source "${ROOT}/scripts/resolve-messaging-test-jwt.sh" || true

export API_BASE
if [[ -x "${ROOT}/scripts/verify-firma-sohbeti-excellence-showcase.sh" ]]; then
  if API_BASE="${API_BASE}" bash "${ROOT}/scripts/verify-firma-sohbeti-excellence-showcase.sh"; then
    exit 0
  fi
fi

echo "== Showcase eksik — seed deneniyor =="
if [[ -x "${ROOT}/scripts/seed-firma-sohbeti-excellence-showcase.sh ]]; then
  API_BASE="${API_BASE}" bash "${ROOT}/scripts/seed-firma-sohbeti-excellence-showcase.sh" || true
  API_BASE="${API_BASE}" FORCE_EXCELLENCE_DEMO=1 bash "${ROOT}/scripts/seed-firma-sohbeti-excellence-showcase.sh" || true
fi

API_BASE="${API_BASE}" bash "${ROOT}/scripts/verify-firma-sohbeti-excellence-showcase.sh"
