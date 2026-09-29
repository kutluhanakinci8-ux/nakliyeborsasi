#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -z "${API_BASE:-}" ]]; then
  # shellcheck source=scripts/resolve-local-api-base.sh
  source "${ROOT}/scripts/resolve-local-api-base.sh" "${ROOT}"
else
  export API_BASE
fi
exec python3 "${ROOT}/scripts/seed-firma-sohbeti-excellence-showcase.py"
