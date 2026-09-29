#!/usr/bin/env bash
# FS-8 prod kapanış: SSE Redis fan-out, push doğrulama, FS-8 verify.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/.env"
INSTALL_DIR="${INSTALL_DIR:-${ROOT}}"

echo "== FS-8 prod kapanış checklist =="

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
fi

FAIL=0

if [[ -z "${REDIS_URL:-}" ]]; then
  echo "FAIL: REDIS_URL tanımlı değil (.env)"
  FAIL=1
else
  echo "OK: REDIS_URL ayarlı"
fi

if [[ "${MESSAGING_SSE_REDIS_FANOUT:-}" != "1" ]]; then
  echo "WARN: MESSAGING_SSE_REDIS_FANOUT=1 değil (tek instance için opsiyonel)"
else
  echo "OK: MESSAGING_SSE_REDIS_FANOUT=1"
fi

if [[ -x "${ROOT}/scripts/verify-messaging-web-push-prod.sh" ]]; then
  if bash "${ROOT}/scripts/verify-messaging-web-push-prod.sh"; then
    echo "OK: verify-messaging-web-push-prod.sh"
  else
    echo "FAIL: verify-messaging-web-push-prod.sh"
    FAIL=1
  fi
else
  echo "SKIP: verify-messaging-web-push-prod.sh yok"
fi

if [[ -x "${ROOT}/scripts/verify-firma-sohbeti-fs8.sh" ]]; then
  if API_BASE="${API_BASE:-}" bash "${ROOT}/scripts/verify-firma-sohbeti-fs8.sh"; then
    echo "OK: verify-firma-sohbeti-fs8.sh"
  else
    echo "FAIL: verify-firma-sohbeti-fs8.sh"
    FAIL=1
  fi
fi

if [[ "${FAIL}" -ne 0 ]]; then
  echo "FS-8 prod checklist: FAIL"
  exit 1
fi
echo "FS-8 prod checklist: PASS"
