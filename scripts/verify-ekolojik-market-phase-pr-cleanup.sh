#!/usr/bin/env bash
# EK-CLEAN: canonical merge dalı + superseded faz PR rehberi (opsiyonel gh listesi).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTROLLER="${ROOT}/apps/api/src/modules/ekolojik-market/EkolojikMarketStatusController.ts"
DOC="${ROOT}/docs/EKOLojIK_MARKET_PHASE_PR_CLEANUP.md"
PREFIX="cursor/ekolojik-market-parity-ek-"
KEEP_SUFFIXES=("roll-5925" "live-5925" "clean-5925" "close-5925" "done-5925")

echo "== Ekolojik phase PR cleanup verify (EK-CLEAN) =="

test -f "${DOC}" || {
  echo "FAIL: missing ${DOC}" >&2
  exit 1
}
test -f "${CONTROLLER}" || {
  echo "FAIL: missing status controller" >&2
  exit 1
}

canonical="$(grep -o 'canonicalMergeBranch: "[^"]*"' "${CONTROLLER}" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')"
if [[ "${canonical}" != "main" && "${canonical}" != "cursor/ekolojik-market-parity-ek-roll-5925" ]]; then
  echo "FAIL: unexpected canonicalMergeBranch: ${canonical:-<empty>}" >&2
  exit 1
fi
echo "OK: canonicalMergeBranch ${canonical}"

grep -q "EK-CLEAN" "${DOC}" || {
  echo "FAIL: cleanup doc missing EK-CLEAN" >&2
  exit 1
}
grep -q "#337" "${DOC}" || {
  echo "FAIL: cleanup doc missing PR #337 ref" >&2
  exit 1
}
echo "OK: cleanup doc present"

grep -q "phasePrCleanupVerifyScript" "${CONTROLLER}" || {
  echo "FAIL: ekolojikCi.phasePrCleanupVerifyScript not in controller" >&2
  exit 1
}
echo "OK: status phasePrCleanupVerifyScript ref"

test -x "${ROOT}/scripts/run-ekolojik-market-close-stale-phase-prs.sh" || {
  echo "FAIL: missing run-ekolojik-market-close-stale-phase-prs.sh" >&2
  exit 1
}
test -x "${ROOT}/scripts/run-ekolojik-market-close-duplicate-canonical-prs.sh" || {
  echo "FAIL: missing run-ekolojik-market-close-duplicate-canonical-prs.sh" >&2
  exit 1
}
grep -q "duplicateCanonicalPrCloseScript" "${CONTROLLER}" || {
  echo "FAIL: duplicateCanonicalPrCloseScript not in controller" >&2
  exit 1
}
grep -q "phasePrCloseScript" "${CONTROLLER}" || {
  echo "FAIL: ekolojikCi.phasePrCloseScript not in controller" >&2
  exit 1
}
echo "OK: EK-CLOSE script + status ref"

if [[ "${EK_CLEAN_LIST_OPEN:-0}" == "1" ]] && command -v gh >/dev/null 2>&1; then
  echo ""
  echo "== Open PRs (ekolojik-market-parity-ek-*) =="
  mapfile -t lines < <(gh pr list --state open --limit 100 --json number,headRefName,title \
    --jq '.[] | select(.headRefName | startswith("cursor/ekolojik-market-parity-ek-")) | "\(.number)\t\(.headRefName)\t\(.title)"' 2>/dev/null || true)
  if [[ "${#lines[@]}" -eq 0 ]]; then
    echo "SKIP: gh pr list empty or unavailable"
  else
    stale=0
    for line in "${lines[@]}"; do
      branch="${line#*$'\t'}"
      branch="${branch%%$'\t'*}"
      keep=0
      for suf in "${KEEP_SUFFIXES[@]}"; do
        if [[ "${branch}" == *"${suf}" ]]; then
          keep=1
          break
        fi
      done
      if [[ "$keep" -eq 1 ]]; then
        echo "KEEP: ${line}"
      else
        echo "STALE (close after rollup merge): ${line}"
        stale=$((stale + 1))
      fi
    done
    echo "OK: listed ${#lines[@]} open PR(s), ${stale} superseded candidate(s)"
  fi
else
  echo "SKIP: EK_CLEAN_LIST_OPEN=0 or gh missing — doc-only verify"
fi

echo "verify-ekolojik-market-phase-pr-cleanup: PASS"
