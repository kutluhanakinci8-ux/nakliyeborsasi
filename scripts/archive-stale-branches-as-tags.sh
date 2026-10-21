#!/usr/bin/env bash
# Merge edilmemiş ama main'den çok geride kalan cursor/* dallarını tag'leyip siler.
# Varsayılan: DRY_RUN=1. Uygulama: DRY_RUN=0 APPLY=1 MIN_BEHIND=80 MAX_AHEAD=20
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY_RUN="${DRY_RUN:-1}"
APPLY="${APPLY:-0}"
MIN_BEHIND="${MIN_BEHIND:-80}"
MAX_AHEAD="${MAX_AHEAD:-20}"
TAG_PREFIX="${TAG_PREFIX:-archive/cursor}"

git fetch origin main --prune
mapfile -t UNMERGED < <(
  git branch -r --no-merged origin/main | sed 's/^ *//' | grep -E '^origin/cursor/' || true
)

ACTIONS=()
for remote in "${UNMERGED[@]}"; do
  name="${remote#origin/}"
  ahead="$(git rev-list --count "origin/main..${remote}" 2>/dev/null || echo 0)"
  behind="$(git rev-list --count "${remote}..origin/main" 2>/dev/null || echo 0)"
  if [[ "${behind}" -ge "${MIN_BEHIND}" && "${ahead}" -le "${MAX_AHEAD}" && "${ahead}" -gt 0 ]]; then
    tag="${TAG_PREFIX}/${name#cursor/}"
    ACTIONS+=("${name}|${tag}|ahead=${ahead}|behind=${behind}")
  fi
done

echo "Stale dal adayı: ${#ACTIONS[@]} (behind>=${MIN_BEHIND}, ahead<=${MAX_AHEAD})"
for row in "${ACTIONS[@]}"; do
  echo "  ${row}"
done

if [[ "${DRY_RUN}" == "1" && "${APPLY}" != "1" ]]; then
  echo "DRY_RUN=1 — tag/silme yok. Uygulama: DRY_RUN=0 APPLY=1 $0"
  exit 0
fi
[[ "${APPLY}" == "1" ]] || { echo "APPLY=1 gerekli" >&2; exit 1; }

for row in "${ACTIONS[@]}"; do
  name="${row%%|*}"
  rest="${row#*|}"
  tag="${rest%%|*}"
  git tag -f "${tag}" "origin/${name}"
  git push origin "refs/tags/${tag}" --force
  git push origin --delete "${name}" || true
done
echo "OK: ${#ACTIONS[@]} dal archive tag + uzak dal silindi"
