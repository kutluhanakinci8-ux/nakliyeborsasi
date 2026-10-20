#!/usr/bin/env bash
# main push sonrası veya mail faz bitiminde: GitHub Deploy VPS workflow tetikle.
set -euo pipefail
REF="${1:-main}"
echo "=== Deploy VPS workflow (ref=${REF}) ==="
gh workflow run deploy-vps.yml --ref "${REF}"
echo "İzleme: gh run list --workflow=deploy-vps.yml --limit 3"
echo "Not: VPS_HOST ve VPS_SSH_KEY repo secrets tanımlı olmalı; yoksa deploy adımı atlanır."
