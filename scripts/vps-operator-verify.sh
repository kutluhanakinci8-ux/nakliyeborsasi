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

if [[ -z "${API_BASE:-}" ]]; then
  if curl -fsS -o /dev/null --connect-timeout 2 --max-time 5 \
    "http://127.0.0.1:3010/api/v1/health" 2>/dev/null; then
    API_BASE="http://127.0.0.1:3010/api/v1"
  else
    API_BASE="https://app.lerta.com.tr/api/v1"
  fi
fi
export API_BASE
export SKIP_PLAYWRIGHT="${SKIP_PLAYWRIGHT:-1}"
export SKIP_AXE="${SKIP_AXE:-1}"
export SKIP_LIGHTHOUSE="${SKIP_LIGHTHOUSE:-1}"
export SKIP_POSTA_PWA="${SKIP_POSTA_PWA:-0}"
export SKIP_DR_DRILL="${SKIP_DR_DRILL:-0}"
export SKIP_NPM_AUDIT="${SKIP_NPM_AUDIT:-1}"

# Operatör JWT: .env OPERATOR_TEST_* veya geçerli OPERATOR_JWT → MP-5/6 snapshot tam koşar
# shellcheck source=scripts/resolve-operator-jwt.sh
source "${ROOT}/scripts/resolve-operator-jwt.sh" || true
if [[ -n "${OPERATOR_JWT:-}" ]]; then
  export OPERATOR_JWT
  echo "OK: OPERATOR_JWT hazır (MP-5/6 operatör snapshot)"
else
  echo "NOT: OPERATOR_JWT yok — communications/deliverability snapshot adımları SKIP olabilir"
fi

bash "${ROOT}/scripts/verify-vps-prod-env-hints.sh"
bash "${ROOT}/scripts/verify-pm2-api-singleton.sh"

if curl -fsS -o /dev/null --connect-timeout 2 --max-time 5 \
  "http://127.0.0.1:3010/api/v1/health/live" 2>/dev/null; then
  echo "OK: yerel API /health/live (127.0.0.1:3010)"
elif curl -fsS -o /dev/null --connect-timeout 3 --max-time 10 \
  "https://app.lerta.com.tr/api/v1/health/live" 2>/dev/null; then
  echo "OK: prod API /health/live (app.lerta.com.tr)"
else
  echo "NOT: /health/live yanıt vermedi — deploy veya PM2 kontrol edin" >&2
  exit 1
fi

bash "${ROOT}/scripts/verify-typeorm-global-entities.sh"
npm run test:unit --prefix "${ROOT}"
SKIP_PLAYWRIGHT="${SKIP_PLAYWRIGHT}" bash "${ROOT}/scripts/run-messaging-maturity-mp-checklist.sh"
bash "${ROOT}/scripts/verify-communications-ops-snapshot.sh"

if [[ "${SKIP_EKOLOJIK_PARITY:-0}" != "1" ]]; then
  if [[ -f "${ROOT}/scripts/verify-ekolojik-market-status-source.sh" ]]; then
    bash "${ROOT}/scripts/verify-ekolojik-market-status-source.sh"
  fi
  if [[ -f "${ROOT}/scripts/run-ekolojik-market-parity-close-checklist.sh" ]]; then
    EK_U4_FULL="${EK_U4_FULL:-0}" \
      EKOLOJIK_API_BASE="${API_BASE}" \
      bash "${ROOT}/scripts/run-ekolojik-market-parity-close-checklist.sh" \
      || echo "NOT: ekolojik parity close checklist (deploy/rubrik gerekebilir)" >&2
  fi
fi

echo ""
echo "OK: vps-operator-verify tamam (Playwright: SKIP_PLAYWRIGHT=${SKIP_PLAYWRIGHT})"
echo "İpucu: Playwright için SKIP_PLAYWRIGHT=0 (sunucuda Chromium indirir — önerilmez)"
