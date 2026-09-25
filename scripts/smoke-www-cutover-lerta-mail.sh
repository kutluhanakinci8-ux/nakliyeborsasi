#!/usr/bin/env bash
# A4 — www (veya kurumsal) Lerta Mail vitrin smoke (değişiklik yapmaz).
set -euo pipefail

BASE_URL="${BASE_URL:-https://www.lerta.com.tr}"
FAIL=0

check_title() {
  local path="$1"
  local url="${BASE_URL%/}${path}"
  local code body title
  code="$(curl -sS -o /tmp/lerta-smoke-body.html -w '%{http_code}' --connect-timeout 12 "$url" 2>/dev/null || echo "000")"
  body="$(cat /tmp/lerta-smoke-body.html 2>/dev/null || true)"
  title="$(echo "$body" | grep -o '<title>[^<]*</title>' | head -1 || true)"

  echo "${path} → HTTP ${code} ${title:-<title yok>}"

  if [[ "$path" == "/durum" && "$code" == "404" ]]; then
    echo "  SKIP: /durum henüz vitrin deploy'unda yok (merge sonrası tekrar deneyin)"
    return 0
  fi

  if [[ "$code" != "200" ]]; then
    echo "  FAIL: HTTP 200 bekleniyordu" >&2
    FAIL=1
    return 0
  fi

  if echo "$title" | grep -qi 'Lerta Mail'; then
    echo "  OK"
  elif echo "$body" | grep -qi 'Lerta Mail\|Sistem durumu'; then
    echo "  OK (body)"
  else
    echo "  FAIL: 'Lerta Mail' bekleniyordu" >&2
    FAIL=1
  fi
}

echo "== Lerta Mail vitrin smoke: ${BASE_URL} =="

check_title "/"
check_title "/sss"
check_title "/kvkk"
check_title "/sla"
check_title "/durum"

echo ""
echo "== Kayıt linki (HTML içinde yonetim) =="
HOME_HTML="$(curl -fsSL --connect-timeout 12 "${BASE_URL%/}/" 2>/dev/null || true)"
if echo "$HOME_HTML" | grep -q 'yonetim.lerta.com.tr'; then
  echo "OK: konsol URL vitrinde görünüyor"
else
  echo "NOT: yonetim.lerta.com.tr bulunamadı (env/build kontrol)" >&2
  FAIL=1
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "Smoke: PASS"
  exit 0
fi
echo "Smoke: FAIL" >&2
exit 1
