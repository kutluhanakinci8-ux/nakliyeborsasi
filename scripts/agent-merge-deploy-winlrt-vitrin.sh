#!/usr/bin/env bash
# WinLRT faz sonu: feature → main merge/push, ardından YALNIZCA vitrin deploy (mail-marketing).
# API/posta/mesaj deploy-production-vps.sh ÇALIŞMAZ.
#
#   VPS_SSH_PASSWORD=… bash scripts/agent-merge-deploy-winlrt-vitrin.sh
#   VPS_SSH_PASSWORD=… bash scripts/agent-merge-deploy-winlrt-vitrin.sh cursor/ltr-skeleton-roadmap-81ce
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FEATURE_BRANCH="${1:-${FEATURE_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}}"

git fetch origin main

if [[ "${FEATURE_BRANCH}" == "main" ]]; then
  git checkout main
  git pull origin main
else
  git fetch origin "${FEATURE_BRANCH}" 2>/dev/null || true
  git checkout main
  git pull origin main
  if git merge-base --is-ancestor "${FEATURE_BRANCH}" main 2>/dev/null; then
    echo "=== ${FEATURE_BRANCH} zaten main içinde ==="
  else
    git merge --no-ff "${FEATURE_BRANCH}" -m "Merge ${FEATURE_BRANCH} (WinLRT vitrin)"
  fi
  git push origin main
fi

echo "=== main @ $(git rev-parse --short HEAD) ==="
bash scripts/deploy-winlrt-vitrin-only.sh
