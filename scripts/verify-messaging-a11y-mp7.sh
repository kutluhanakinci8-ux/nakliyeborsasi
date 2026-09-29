#!/usr/bin/env bash
# MP-7: axe kritik 0 (varsayılan: login → messaging redirect URL).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${SKIP_AXE:-}" == "1" ]]; then
  echo "SKIP: SKIP_AXE=1"
  exit 0
fi

echo "== MP-7 messaging a11y (axe) =="
bash "${ROOT}/scripts/verify-axe-messaging.sh"
echo "MP-7 messaging a11y verify: PASS"
