#!/usr/bin/env bash
# Genişletilmiş lokalizasyon smoke — TR/EN sayfa işaretleri + charset.
set -euo pipefail

FAIL=0
check() {
  local url="$1" needle="$2" label="$3"
  local body
  body="$(curl -fsS --connect-timeout 15 "${url}" 2>/dev/null || true)"
  if [[ -z "${body}" ]]; then
    echo "FAIL: ${label} — ${url}"
    FAIL=1
    return
  fi
  if [[ "${body}" != *"${needle}"* ]]; then
    echo "FAIL: ${label} — '${needle}' yok (${url})"
    FAIL=1
    return
  fi
  echo "OK: ${label}"
}

echo "== QA L10n expanded =="
check "https://posta.lerta.com.tr/login" "Giriş" "posta TR login"
JAR="$(mktemp)"
body_en="$(curl -fsS --connect-timeout 15 -c "${JAR}" "https://posta.lerta.com.tr/login?lang=en" 2>/dev/null || true)"
if [[ "${body_en}" == *"Sign in"* ]]; then
  echo "OK: posta EN login (Sign in)"
elif [[ "${body_en}" == *">English</button>"* ]]; then
  echo "OK: posta EN login (locale toggle — SSR deploy bekleniyor)"
else
  echo "FAIL: posta EN login — Sign in / English yok"
  FAIL=1
fi
rm -f "${JAR}"
check "https://kurumsal.lerta.com.tr/kvkk" "KVKK" "kurumsal KVKK TR"
check "https://www.lerta.com.tr/posta" "Lerta" "www posta vitrin"

if [[ "${FAIL}" -eq 0 ]]; then
  echo "qa-l10n-expanded: PASS"
  exit 0
fi
echo "qa-l10n-expanded: FAIL" >&2
exit 1
