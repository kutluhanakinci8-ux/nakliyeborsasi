#!/usr/bin/env bash
# Cloud Agent / CI: feature dalını main'e merge et, push et, VPS deploy.
# Kullanım:
#   bash scripts/agent-merge-deploy-main.sh              # mevcut dal → main
#   bash scripts/agent-merge-deploy-main.sh cursor/foo-8521
#   FEATURE_BRANCH=main bash scripts/agent-merge-deploy-main.sh   # yalnızca deploy
#
# Ortam: VPS_SSH_PRIVATE_KEY veya VPS_SSH_PASSWORD, isteğe bağlı VPS_HOST (168.231.109.27)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FEATURE_BRANCH="${1:-${FEATURE_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}}"
DEPLOY_BRANCH=main

git fetch origin main

if [[ "${FEATURE_BRANCH}" == "main" ]]; then
  git checkout main
  git pull origin main
else
  if ! git show-ref --verify --quiet "refs/heads/${FEATURE_BRANCH}"; then
    git fetch origin "${FEATURE_BRANCH}" 2>/dev/null || true
  fi
  git checkout main
  git pull origin main
  if git merge-base --is-ancestor "${FEATURE_BRANCH}" main 2>/dev/null; then
    echo "=== ${FEATURE_BRANCH} zaten main içinde — merge atlandı ==="
  else
    git merge --no-ff "${FEATURE_BRANCH}" -m "Merge branch '${FEATURE_BRANCH}'"
  fi
  git push origin main
  echo "=== main push tamam ($(git rev-parse --short HEAD)) ==="
fi

if [[ -n "${SKIP_VPS_DEPLOY:-}" ]]; then
  echo "SKIP_VPS_DEPLOY=1 — GitHub Actions (push main) deploy bekleniyor."
  exit 0
fi

if [[ -n "${VPS_SSH_PRIVATE_KEY:-}" || -n "${VPS_SSH_PASSWORD:-}" ]]; then
  VPS_BRANCH="${DEPLOY_BRANCH}" bash scripts/deploy-vps-ssh.sh
else
  echo "UYARI: VPS_SSH_* yok — yerel deploy atlandı."
  echo "GitHub: push main → workflow Deploy VPS (secrets tanımlıysa) otomatik çalışır."
fi
