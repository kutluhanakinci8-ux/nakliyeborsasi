#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/verify-project-root.sh

if [[ ! -f "${ROOT}/apps/web/next.config.js" ]]; then
  echo "HATA: apps/web/next.config.js yok. git pull / vps-update.sh çalıştırın." >&2
  exit 1
fi

if grep -q "outputFileTracingRoot" "${ROOT}/apps/web/next.config.js" 2>/dev/null; then
  echo "HATA: Eski next.config.js. git reset --hard origin/cursor/modular-freight-platform-18ba" >&2
  exit 1
fi

read_react_version() {
  node -p "require('${1}/package.json').version" 2>/dev/null || echo missing
}

REACT_BEFORE="$(read_react_version "${ROOT}/node_modules/react")"
if [[ "${REACT_BEFORE}" != 19.* ]]; then
  echo "=== React ${REACT_BEFORE} — temiz node_modules kurulumu ==="
  rm -rf node_modules apps/web/node_modules apps/web/.next
fi

bash "${ROOT}/scripts/install-deps.sh"

echo "=== Tek React kopyası (symlink) ==="
rm -rf apps/web/node_modules/react apps/web/node_modules/react-dom
mkdir -p apps/web/node_modules
ln -sfn ../../node_modules/react apps/web/node_modules/react
ln -sfn ../../node_modules/react-dom apps/web/node_modules/react-dom

REACT_VERSION="$(read_react_version "${ROOT}/node_modules/react")"
DOM_VERSION="$(read_react_version "${ROOT}/node_modules/react-dom")"
NEXT_VERSION="$(read_react_version "${ROOT}/apps/web/node_modules/next")"
echo "react=${REACT_VERSION} react-dom=${DOM_VERSION} next=${NEXT_VERSION}"

if [[ "${REACT_VERSION}" != 19.* ]]; then
  echo "HATA: Kök React 19 değil (${REACT_VERSION})." >&2
  echo "  cd ${ROOT} && rm -rf node_modules apps/web/node_modules && npm install" >&2
  exit 1
fi

if [[ "${NEXT_VERSION}" != 14.2.15 ]]; then
  npm install next@14.2.15 -w @nakliyeborsasi/web
fi

export NEXT_TELEMETRY_DISABLED=1

echo "=== next build ==="
npm run build -w @nakliyeborsasi/web

echo "Web build tamam."
