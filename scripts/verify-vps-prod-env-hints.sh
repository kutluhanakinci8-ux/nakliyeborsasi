#!/usr/bin/env bash
# VPS prod .env ipuçları (FAIL etmez — operatör bilgilendirme).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT}/.env}"
WARN=0

echo "== VPS prod env hints =="

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "NOT: ${ENV_FILE} yok — OPERATOR_TEST_* ve WA webhook kontrol edilemedi"
  exit 0
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

if [[ -z "${OPERATOR_TEST_EMAIL:-}" && -z "${PLATFORM_OPERATOR_EMAIL:-}" ]]; then
  echo "NOT: OPERATOR_TEST_EMAIL (veya PLATFORM_OPERATOR_EMAIL) tanımlı değil — MP-5/6 snapshot JWT otomatik login atlanır"
  WARN=1
fi
if [[ -z "${OPERATOR_TEST_PASSWORD:-}" && -z "${PLATFORM_OPERATOR_PASSWORD:-}" ]]; then
  echo "NOT: OPERATOR_TEST_PASSWORD tanımlı değil"
  WARN=1
fi

bridge="${MESSAGING_WHATSAPP_BRIDGE_WEBHOOK_URL:-}"
if [[ -z "${bridge}" ]]; then
  echo "NOT: MESSAGING_WHATSAPP_BRIDGE_WEBHOOK_URL boş — MP-2 WA köprüsü webhook modunda değil (Twilio veya none)"
  WARN=1
else
  echo "OK: MESSAGING_WHATSAPP_BRIDGE_WEBHOOK_URL ayarlı"
fi

if [[ "${WARN}" -eq 0 ]]; then
  echo "VPS prod env hints: tam"
else
  echo "VPS prod env hints: ${WARN} uyarı (deploy engellenmez)"
fi
