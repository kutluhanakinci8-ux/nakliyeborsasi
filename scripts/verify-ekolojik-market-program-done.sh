#!/usr/bin/env bash
# EK-DONE: parite programı kapanış manifesti (kod fazları + ops zinciri).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROADMAP="${ROOT}/docs/EKOLojIK_MARKET_PARITY_ROADMAP.md"
CONTROLLER="${ROOT}/apps/api/src/modules/ekolojik-market/EkolojikMarketStatusController.ts"

echo "== Ekolojik market program done (EK-DONE) =="

test -f "${ROADMAP}" && test -f "${CONTROLLER}" || {
  echo "FAIL: roadmap or controller missing" >&2
  exit 1
}

for section in \
  EK-U4 EK-FULL EK-LIVE EK-CLEAN EK-CLOSE EK-ROLL EK-OPS EK-DONE; do
  grep -q "## ${section}" "${ROADMAP}" || {
    echo "FAIL: roadmap missing section ${section}" >&2
    exit 1
  }
done
echo "OK: roadmap ops + closure sections"

grep -q 'programComplete: true' "${CONTROLLER}" || {
  echo "FAIL: parityClose.programDone.programComplete not true" >&2
  exit 1
}
grep -q "ekolojik_program_done_gate" "${CONTROLLER}" || {
  echo "FAIL: missing ekolojik_program_done_gate feature" >&2
  exit 1
}
grep -q '"ek-done"' "${CONTROLLER}" || {
  echo "FAIL: missing ek-done milestone" >&2
  exit 1
}
echo "OK: status program done flags"

for script in \
  verify-ekolojik-market-program-done.sh \
  verify-ekolojik-market-roll-manifest.sh \
  verify-ekolojik-market-status-source.sh \
  verify-ekolojik-market-phase-pr-cleanup.sh \
  run-ekolojik-market-parity-close-checklist.sh \
  run-ekolojik-market-post-deploy-gate.sh \
  run-ekolojik-market-close-stale-phase-prs.sh \
  smoke-ekolojik-market-parity.sh; do
  test -x "${ROOT}/scripts/${script}" || {
    echo "FAIL: missing scripts/${script}" >&2
    exit 1
  }
done
echo "OK: operator script bundle"

bash "${ROOT}/scripts/verify-ekolojik-market-roll-manifest.sh"

echo "verify-ekolojik-market-program-done: PASS"
