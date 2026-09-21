#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/verify-project-root.sh

if [[ ! -f "${ROOT}/apps/web/next.config.js" ]]; then
  echo "HATA: apps/web/next.config.js yok. Önce: git pull origin cursor/modular-freight-platform-18ba" >&2
  exit 1
fi

if grep -q "outputFileTracingRoot" "${ROOT}/apps/web/next.config.js" 2>/dev/null; then
  echo "HATA: Eski next.config.js (outputFileTracingRoot). git pull ile güncelleyin." >&2
  exit 1
fi

echo "=== Çift React kopyalarını kaldır (Next SSR hatası) ==="
rm -rf apps/web/node_modules/react apps/web/node_modules/react-dom

echo "=== npm install (monorepo kökü) ==="
npm install

echo "=== React tek kopya — apps/web -> kök symlink ==="
mkdir -p apps/web/node_modules
ln -sfn ../../node_modules/react apps/web/node_modules/react
ln -sfn ../../node_modules/react-dom apps/web/node_modules/react-dom

REACT_VERSION="$(node -p "require('./node_modules/react/package.json').version" 2>/dev/null || echo missing)"
DOM_VERSION="$(node -p "require('./node_modules/react-dom/package.json').version" 2>/dev/null || echo missing)"
NEXT_VERSION="$(node -p "require('./apps/web/node_modules/next/package.json').version" 2>/dev/null || echo missing)"
echo "react=${REACT_VERSION} react-dom=${DOM_VERSION} next=${NEXT_VERSION}"

if [[ "${REACT_VERSION}" != 19.* ]]; then
  echo "React 19 yükleniyor..."
  npm install react@19.0.0 react-dom@19.0.0
  ln -sfn ../../node_modules/react apps/web/node_modules/react
  ln -sfn ../../node_modules/react-dom apps/web/node_modules/react-dom
fi

if [[ "${NEXT_VERSION}" != 14.2.15 ]]; then
  echo "Next 14.2.15 sabitleniyor..."
  npm install next@14.2.15 -w @nakliyeborsasi/web
fi

export NEXT_TELEMETRY_DISABLED=1

echo "=== next build ==="
npm run build -w @nakliyeborsasi/web

echo "Web build tamam."
