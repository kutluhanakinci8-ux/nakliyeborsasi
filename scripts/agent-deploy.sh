#!/usr/bin/env bash
# Agent bitişinde: deploy branch'e push sonrası VPS güncelle.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEPLOY_BRANCH="${DEPLOY_BRANCH:-cursor/own-mail-platform-519e}"

if [[ -n "${VPS_SSH_PRIVATE_KEY:-}" ]] || [[ -n "${VPS_SSH_PASSWORD:-}" ]]; then
  bash scripts/deploy-vps-ssh.sh
  exit 0
fi

if command -v gh >/dev/null 2>&1; then
  echo "SSH secret yok; GitHub Actions deploy workflow tetikleniyor…"
  gh workflow run deploy-vps.yml --ref "$DEPLOY_BRANCH" 2>/dev/null || true
  sleep 3
  RUN_ID="$(gh run list --workflow=deploy-vps.yml --branch="$DEPLOY_BRANCH" --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null || true)"
  if [[ -n "$RUN_ID" && "$RUN_ID" != "null" ]]; then
    echo "Workflow run: https://github.com/kutluhanakinci8-ux/nakliyeborsasi/actions/runs/${RUN_ID}"
    gh run watch "$RUN_ID" --exit-status 2>/dev/null && exit 0 || true
  fi
fi

echo "UYARI: Otomatik deploy yapılamadı. GitHub repo Secrets: VPS_HOST, VPS_USER, VPS_SSH_KEY ekleyin (bir kez)." >&2
exit 1
