#!/usr/bin/env bash
# EK-DEDUP: #341 main merge sonrası duplicate rollup dal PR'ları (#337–#340) kapat.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="${ROOT}/docs/EKOLojIK_MARKET_PHASE_PR_CLEANUP.md"
PREFIX="cursor/ekolojik-market-parity-ek-"
DUP_SUFFIXES=("roll-5925" "live-5925" "clean-5925" "close-5925")
APPLY="${EK_DEDUP_CANONICAL_PRS:-0}"
MERGED_PR="${EK_CANONICAL_MERGED_PR:-341}"

echo "== Ekolojik duplicate canonical PR close (EK-DEDUP) =="

test -f "${DOC}" || {
  echo "FAIL: missing ${DOC}" >&2
  exit 1
}

git fetch origin main -q 2>/dev/null || true
git show "origin/main:apps/api/src/modules/ekolojik-market/EkolojikMarketStatusController.ts" \
  >/dev/null 2>&1 || {
  echo "FAIL: rollup not on origin/main yet" >&2
  exit 1
}
echo "OK: rollup on origin/main"

if ! command -v gh >/dev/null 2>&1; then
  echo "FAIL: gh CLI required" >&2
  exit 1
fi

is_dup_branch() {
  local branch="$1"
  local suf
  for suf in "${DUP_SUFFIXES[@]}"; do
    if [[ "${branch}" == "${PREFIX}${suf}" ]]; then
      return 0
    fi
  done
  return 1
}

mapfile -t rows < <(gh pr list --state open --limit 100 --json number,headRefName,title \
  --jq ".[] | select(.headRefName | startswith(\"${PREFIX}\")) | \"\(.number)\t\(.headRefName)\t\(.title)\"")

dup_nums=()
for row in "${rows[@]}"; do
  [[ -n "${row}" ]] || continue
  num="${row%%$'\t'*}"
  rest="${row#*$'\t'}"
  branch="${rest%%$'\t'*}"
  if is_dup_branch "${branch}"; then
    echo "DUP #${num} ${branch}"
    dup_nums+=("${num}")
  else
    echo "SKIP #${num} ${branch}"
  fi
done

echo ""
echo "Duplicate canonical PRs: ${#dup_nums[@]}"

if [[ "${#dup_nums[@]}" -eq 0 ]]; then
  echo "run-ekolojik-market-close-duplicate-canonical-prs: PASS (none open)"
  exit 0
fi

if [[ "${APPLY}" != "1" ]]; then
  echo "DRY-RUN: EK_DEDUP_CANONICAL_PRS=1 to close (merged via #${MERGED_PR})"
  echo "run-ekolojik-market-close-duplicate-canonical-prs: PASS (dry-run)"
  exit 0
fi

for num in "${dup_nums[@]}"; do
  echo "Closing #${num}..."
  gh pr close "${num}" || echo "WARN: could not close #${num}" >&2
done

echo "run-ekolojik-market-close-duplicate-canonical-prs: PASS"
