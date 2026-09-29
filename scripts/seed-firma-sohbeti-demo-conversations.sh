#!/usr/bin/env bash
# Firma sohbeti demo thread + mesajları (API üzerinden).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/resolve-local-api-base.sh
source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}" 2>/dev/null || true
export API_BASE="${API_BASE:-https://app.lerta.com.tr/api/v1}"
exec python3 "${ROOT}/scripts/seed-firma-sohbeti-demo-conversations.py"
