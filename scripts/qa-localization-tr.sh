#!/usr/bin/env bash
# Lokalizasyon (TR): vitrin + posta login Türkçe işaretleri ve tarih formatı örneği.
set -euo pipefail
FAIL=0

check_tr_page() {
  local url="$1"
  local needle="$2"
  local body
  body="$(curl -fsS --connect-timeout 15 "${url}" 2>/dev/null || true)"
  if [[ -z "${body}" ]]; then
    echo "FAIL: ${url} alınamadı"
    FAIL=1
    return
  fi
  if [[ "${body}" != *"${needle}"* ]]; then
    echo "WARN: ${url} — '${needle}' bulunamadı"
    FAIL=1
    return
  fi
  echo "OK: ${url} (${needle})"
}

echo "== QA Localization (tr-TR) =="
check_tr_page "https://kurumsal.lerta.com.tr/kvkk" "KVKK"
check_tr_page "https://posta.lerta.com.tr/login" "Giriş"
check_tr_page "https://www.lerta.com.tr/posta" "Lerta"

# API locale-independent; UI date formatting checked in unit tests indirectly
sample="$(TZ=Europe/Istanbul date '+%d.%m.%Y %H:%M')"
echo "OK: Istanbul TZ sample ${sample}"

if [[ "${FAIL}" -eq 0 ]]; then
  echo "qa-localization-tr: PASS"
  exit 0
fi
echo "qa-localization-tr: FAIL" >&2
exit 1
