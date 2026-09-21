#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/verify-project-root.sh

if [[ ! -f "${ROOT}/apps/web/next.config.js" ]]; then
  echo "HATA: apps/web/next.config.js yok." >&2
  exit 1
fi

read_react_version() {
  if [[ -f "${ROOT}/apps/web/node_modules/react/package.json" ]]; then
    node -p "require('${ROOT}/apps/web/node_modules/react/package.json').version"
  elif [[ -f "${ROOT}/node_modules/react/package.json" ]]; then
    node -p "require('${ROOT}/node_modules/react/package.json').version"
  else
    echo missing
  fi
}

REACT_BEFORE="$(read_react_version)"
if [[ "${REACT_BEFORE}" != 18.* ]]; then
  echo "=== React ${REACT_BEFORE} — web node_modules yenileniyor ==="
  rm -rf node_modules apps/web/node_modules apps/web/.next
fi

bash "${ROOT}/scripts/install-deps.sh"

REACT_VERSION="$(read_react_version)"
NEXT_VERSION="$(node -p "require('${ROOT}/apps/web/node_modules/next/package.json').version" 2>/dev/null || echo missing)"
echo "react=${REACT_VERSION} next=${NEXT_VERSION}"

if [[ "${REACT_VERSION}" != 18.* ]]; then
  echo "HATA: Next 14 için React 18.3.1 gerekli (şu an ${REACT_VERSION})." >&2
  exit 1
fi

if [[ "${NEXT_VERSION}" != 14.2.15 ]]; then
  npm install next@14.2.15 @next/swc-linux-x64-gnu@14.2.15 -w @nakliyeborsasi/web --save-exact
fi

export NEXT_TELEMETRY_DISABLED=1

echo "=== .next temizle (eski React 19 build 500 verir) ==="
rm -rf apps/web/.next

echo "=== next build ==="
npm run build -w @nakliyeborsasi/web

echo "Web build tamam."
