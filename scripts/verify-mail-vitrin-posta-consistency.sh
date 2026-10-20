#!/usr/bin/env bash
# P1 — Vitrin ↔ posta login marka tutarlılığı (HTTP smoke).
set -euo pipefail

VITRIN="${VITRIN_BASE_URL:-https://www.lerta.com.tr}"
POSTA="${POSTA_BASE_URL:-https://posta.lerta.com.tr}"
FAIL=0

fetch() {
  curl -sS -o /tmp/lerta-consistency-body.html -w '%{http_code}' \
    --connect-timeout 12 "$1" 2>/dev/null || echo "000"
}

echo "== Vitrin / posta tutarlılık: ${VITRIN} · ${POSTA} =="

for url in "${VITRIN%/}/posta" "${POSTA%/}/login"; do
  code="$(fetch "$url")"
  body="$(cat /tmp/lerta-consistency-body.html 2>/dev/null || true)"
  echo "${url} → HTTP ${code}"
  if [[ "$code" != "200" ]]; then
    echo "  FAIL" >&2
    FAIL=1
    continue
  fi
  if echo "$body" | grep -qi 'Lerta'; then
    echo "  OK: Lerta marka"
  else
    echo "  FAIL: Lerta marka metni yok" >&2
    FAIL=1
  fi
done

if [[ "$FAIL" -eq 0 ]]; then
  echo "PASS"
  exit 0
fi
exit 1
