#!/usr/bin/env bash
# VPS üzerinde repo kökünden çalıştırın: cd /var/www/nakliyeborsasi && bash scripts/vps-operator-verify.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

if [[ ! -f "${ROOT}/package.json" ]]; then
  echo "FAIL: package.json yok — önce: cd /var/www/nakliyeborsasi" >&2
  exit 1
fi

echo "== VPS operator verify (ROOT=${ROOT}) =="
echo "Branch/commit: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?') $(git log -1 --oneline 2>/dev/null || true)"

export API_BASE="${API_BASE:-https://app.lerta.com.tr/api/v1}"
export SKIP_PLAYWRIGHT="${SKIP_PLAYWRIGHT:-1}"

bash "${ROOT}/scripts/verify-typeorm-global-entities.sh"
npm run test:unit --prefix "${ROOT}"
SKIP_PLAYWRIGHT="${SKIP_PLAYWRIGHT}" bash "${ROOT}/scripts/run-messaging-maturity-mp-checklist.sh"
bash "${ROOT}/scripts/verify-communications-ops-snapshot.sh"

echo ""
echo "OK: vps-operator-verify tamam (Playwright: SKIP_PLAYWRIGHT=${SKIP_PLAYWRIGHT})"
echo "İpucu: Playwright için SKIP_PLAYWRIGHT=0 (sunucuda Chromium indirir — önerilmez)"
