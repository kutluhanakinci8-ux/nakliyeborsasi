#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/verify-project-root.sh

echo "=== npm install (monorepo kökü — web build için zorunlu) ==="
npm install

REACT_VERSION="$(node -p "require('./node_modules/react/package.json').version" 2>/dev/null || echo missing)"
DOM_VERSION="$(node -p "require('./node_modules/react-dom/package.json').version" 2>/dev/null || echo missing)"
echo "Root react: ${REACT_VERSION}, react-dom: ${DOM_VERSION}"

if [[ "${REACT_VERSION}" != 19.* ]]; then
  echo "HATA: Kök node_modules içinde React 19 gerekli. VPS'te apps/web içinde değil, /var/www/nakliyeborsasi kökünden npm install çalıştırın." >&2
  exit 1
fi

export NEXT_TELEMETRY_DISABLED=1

echo "=== Next.js build (@nakliyeborsasi/web) ==="
npm run build -w @nakliyeborsasi/web

echo "Web build tamam."
