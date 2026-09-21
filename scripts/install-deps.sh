#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/verify-project-root.sh

if [[ ! -d node_modules ]] || [[ ! -x node_modules/.bin/tsc ]] || [[ ! -x node_modules/.bin/nest ]]; then
  echo "=== npm install (bağımlılıklar — tsc/nest için gerekli) ==="
  npm install
else
  echo "=== npm install (kontrol) ==="
  npm install
fi

echo "Bağımlılıklar hazır: tsc=$(node -p "require('./node_modules/typescript/package.json').version" 2>/dev/null || echo yok)"
