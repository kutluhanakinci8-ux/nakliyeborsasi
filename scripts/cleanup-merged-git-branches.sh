#!/usr/bin/env bash
# origin/main'e merge edilmiş cursor/* dallarını temizler (varsayılan: dry-run).
# DRY_RUN=0 APPLY=1 bash scripts/cleanup-merged-git-branches.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY_RUN="${DRY_RUN:-1}"
APPLY="${APPLY:-0}"
REPORT_DIR="${ROOT}/archive/git"
REPORT="${REPORT_DIR}/merged-branches-cleanup-$(date -u +%Y%m%dT%H%M%SZ).txt"
UNMERGED_REPORT="${REPORT_DIR}/unmerged-branches.txt"

mkdir -p "${REPORT_DIR}"
git fetch origin main --prune

mapfile -t MERGED < <(
  git branch -r --merged origin/main | sed 's/^ *//' | grep -E '^origin/cursor/' || true
)
mapfile -t UNMERGED < <(
  git branch -r --no-merged origin/main | sed 's/^ *//' | grep -E '^origin/cursor/' || true
)

{
  echo "# merged cursor branches ($(date -u -Iseconds))"
  printf '%s\n' "${MERGED[@]}"
  echo ""
  echo "# count merged: ${#MERGED[@]}"
} > "${REPORT}"

printf '%s\n' "${UNMERGED[@]}" > "${UNMERGED_REPORT}"
echo "Rapor: ${REPORT}"
echo "Merge edilmemiş cursor dalları: ${#UNMERGED[@]} → ${UNMERGED_REPORT}"

if [[ "${DRY_RUN}" == "1" && "${APPLY}" != "1" ]]; then
  echo "DRY_RUN=1 — silme yapılmadı. Uygulamak için: DRY_RUN=0 APPLY=1 $0"
  exit 0
fi

if [[ "${APPLY}" != "1" ]]; then
  echo "APPLY=1 gerekli (veya DRY_RUN=0 APPLY=1)" >&2
  exit 1
fi

deleted=0
failed=0
for remote in "${MERGED[@]}"; do
  name="${remote#origin/}"
  if [[ "${name}" == "main" || -z "${name}" ]]; then
    continue
  fi
  if git push origin --delete "${name}" 2>/dev/null; then
    deleted=$((deleted + 1))
  else
    failed=$((failed + 1))
    echo "UYARI: uzak silinemedi: ${name}" >&2
  fi
  if git show-ref --verify --quiet "refs/heads/${name}"; then
    git branch -D "${name}" 2>/dev/null || true
  fi
done

echo "OK: ${deleted} uzak cursor dalı silindi (${failed} hata)"
