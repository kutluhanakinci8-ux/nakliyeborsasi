#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3000}"

echo "=== Port ${PORT} dinleyen süreçler ==="
if command -v ss >/dev/null 2>&1; then
  ss -lntp | grep ":${PORT} " || echo "(ss: bu portta süreç görünmüyor)"
fi
if command -v lsof >/dev/null 2>&1; then
  lsof -i ":${PORT}" -sTCP:LISTEN || true
else
  echo "lsof yüklü değil; kurulum: apt install -y lsof"
fi

echo ""
echo "=== Sağlık kontrolü (JSON beklenir) ==="
curl -sS "http://127.0.0.1:${PORT}/api/v1/health" || echo "curl başarısız"
echo ""
