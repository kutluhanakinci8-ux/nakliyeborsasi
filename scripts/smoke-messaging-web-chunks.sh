#!/usr/bin/env bash
# Prod/staging: messaging sayfası HTML'deki _next chunk'ların 200 döndüğünü doğrular.
set -euo pipefail
BASE="${MESSAGING_WEB_PUBLIC_URL:-https://app.lerta.com.tr}"
PATH_URL="${BASE}/messaging?tab=sohbet"
html="$(curl -fsS "${PATH_URL}")"
mapfile -t chunks < <(echo "${html}" | grep -oE '_next/static/chunks/[^"]+\.js' | sort -u | head -8)
if [[ ${#chunks[@]} -lt 1 ]]; then
  echo "FAIL: chunk URL bulunamadı"
  exit 1
fi
failed=0
for c in "${chunks[@]}"; do
  code="$(curl -sS -o /dev/null -w "%{http_code}" "${BASE}/${c}")"
  if [[ "${code}" != "200" ]]; then
    echo "FAIL: ${c} HTTP ${code}"
    failed=1
  fi
done
if [[ "${failed}" -ne 0 ]]; then
  echo "Öneri: VPS'te bash scripts/restart-web.sh (build/HTML uyumsuzluğu)"
  exit 1
fi
echo "OK: ${#chunks[@]} chunk HTTP 200 (${BASE})"
