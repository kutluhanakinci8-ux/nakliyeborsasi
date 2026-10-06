#!/usr/bin/env bash
# EK-CLOSE: superseded cursor/ekolojik-market-parity-ek-* PR'larını kapat (varsayılan dry-run).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="${ROOT}/docs/EKOLojIK_MARKET_PHASE_PR_CLEANUP.md"
BRANCH_PREFIX="cursor/ekolojik-market-parity-ek-"
KEEP_SUFFIXES=("roll-5925" "live-5925" "clean-5925" "close-5925")
APPLY="${EK_CLOSE_STALE_PRS:-0}"
REQUIRE_MAIN="${EK_CLOSE_REQUIRE_MAIN_ROLLED:-1}"

echo "== Ekolojik close stale phase PRs (EK-CLOSE) =="

test -f "${DOC}" || {
  echo "FAIL: missing ${DOC}" >&2
  exit 1
}

if ! command -v gh >/dev/null 2>&1; then
  echo "FAIL: gh CLI required" >&2
  exit 1
fi

main_has_rollup() {
  git fetch origin main -q 2>/dev/null || true
  git show "origin/main:apps/api/src/modules/ekolojik-market/EkolojikMarketStatusController.ts" \
    >/dev/null 2>&1
}

if [[ "${REQUIRE_MAIN}" == "1" ]] && ! main_has_rollup; then
  echo "FAIL: origin/main has no ekolojik status module — merge canonical rollup first (#337/#339)" >&2
  exit 1
fi
if [[ "${REQUIRE_MAIN}" == "1" ]]; then
  echo "OK: origin/main includes ekolojik market status"
fi

is_keep_branch() {
  local branch="$1"
  local suf
  for suf in "${KEEP_SUFFIXES[@]}"; do
    if [[ "${branch}" == *"${suf}" ]]; then
      return 0
    fi
  done
  return 1
}

mapfile -t rows < <(gh pr list --state open --limit 100 --json number,headRefName,title \
  --jq ".[] | select(.headRefName | startswith(\"${BRANCH_PREFIX}\")) | \"\(.number)\t\(.headRefName)\t\(.title)\"")

stale_nums=()
for row in "${rows[@]}"; do
  [[ -n "${row}" ]] || continue
  num="${row%%$'\t'*}"
  rest="${row#*$'\t'}"
  branch="${rest%%$'\t'*}"
  if is_keep_branch "${branch}"; then
    echo "KEEP #${num} ${branch}"
  else
    echo "STALE #${num} ${branch}"
    stale_nums+=("${num}")
  fi
done

echo ""
echo "Open ekolojik PRs: ${#rows[@]}, stale: ${#stale_nums[@]}"

if [[ "${#stale_nums[@]}" -eq 0 ]]; then
  echo "run-ekolojik-market-close-stale-phase-prs: PASS (nothing to close)"
  exit 0
fi

if [[ "${APPLY}" != "1" ]]; then
  echo "DRY-RUN: set EK_CLOSE_STALE_PRS=1 to close stale PRs (see ${DOC})"
  echo "run-ekolojik-market-close-stale-phase-prs: PASS (dry-run)"
  exit 0
fi

comment="Superseded by canonical Ekolojik Market rollup — see docs/EKOLojIK_MARKET_PHASE_PR_CLEANUP.md"
for num in "${stale_nums[@]}"; do
  echo "Closing #${num}..."
  gh pr close "${num}" --comment "${comment}"
done

echo "run-ekolojik-market-close-stale-phase-prs: PASS (closed ${#stale_nums[@]} PR(s))"
