#!/usr/bin/env bash
# MP-10: Parite kapanış kapısı — sign-off dok + (opsiyonel) tam maturity + wave-2.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SIGNOFF="${ROOT}/docs/MESSAGING_POSTA_MP10_SIGNOFF.md"
SCORECARD="${ROOT}/docs/LERTA_MESSAGING_POSTA_COMPETITIVE_SCORECARD.md"

echo "== MP-10 messaging/posta parity close gate =="

if [[ ! -f "${SIGNOFF}" ]]; then
  echo "FAIL: ${SIGNOFF} yok" >&2
  exit 1
fi
grep -q "MP-10 closure" "${SIGNOFF}" || { echo "FAIL: sign-off MP-10 closure satırı" >&2; exit 1; }
grep -q "verify-messaging-parity-close-mp10.sh" "${SIGNOFF}" || { echo "FAIL: sign-off komut referansı" >&2; exit 1; }
echo "OK: MP-10 sign-off dokümanı"

if [[ ! -f "${SCORECARD}" ]]; then
  echo "FAIL: scorecard yok" >&2
  exit 1
fi
grep -q "MP-10 closure" "${SCORECARD}" || { echo "FAIL: scorecard MP-10 closure bölümü" >&2; exit 1; }
echo "OK: scorecard MP-10 closure işareti"

bash "${ROOT}/scripts/verify-firma-sohbeti-fs12.sh"
echo "OK: FS-12 verify"

if [[ "${MP10_FULL:-0}" == "1" ]]; then
  echo "== MP-10 full: maturity (MP-1…9) =="
  export SKIP_PLAYWRIGHT="${SKIP_PLAYWRIGHT:-1}"
  export SKIP_AXE="${SKIP_AXE:-1}"
  export SKIP_LIGHTHOUSE="${SKIP_LIGHTHOUSE:-1}"
  export SKIP_NPM_AUDIT="${SKIP_NPM_AUDIT:-1}"
  bash "${ROOT}/scripts/run-messaging-maturity-mp-checklist.sh"

  if [[ "${SKIP_WAVE2_PARITY:-0}" == "1" ]]; then
    echo "SKIP: SKIP_WAVE2_PARITY=1 — wave-2 parity"
  else
    echo "== MP-10 full: mail/messaging wave-2 =="
    export SKIP_DR_DRILL="${SKIP_DR_DRILL:-0}"
    bash "${ROOT}/scripts/run-mail-messaging-parity-wave2-checklist.sh"
  fi
else
  echo "SKIP: MP10_FULL=0 — maturity + wave-2 atlandı (VPS tam kapı: MP10_FULL=1)"
fi

echo "MP-10 messaging/posta parity close gate: PASS"
