#!/usr/bin/env bash
# mail-web: locale dosyaları dışında sabit Türkçe UI string taraması (bilinen istisnalar hariç).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT}/apps/mail-web/src"
ALLOWLIST=(
  "mailWebLocale"
  "mailWebLocaleI18n"
  "mailComposePresets"
  "MailSettingsPanel"
  "*.test."
  "*.spec."
)

echo "== QA i18n mail-web hardcoded TR gate =="

mapfile -t hits < <(
  rg -n --glob '*.tsx' --glob '*.ts' \
    -e '"(Giriş|Ayarlar|Gönder|Sil|İptal|Kaydet|Taslak|Klasör|Gelen|Giden|Spam|Çöp|Türkçe)"' \
    "${SRC}" 2>/dev/null \
    | grep -v '/mailWebLocale' \
    | grep -v '/mailLocale\.ts' \
    | grep -v mailComposePresets \
    | grep -v MailSettingsPanel \
    | grep -v '/app/mail/' \
    || true
)

if [[ "${#hits[@]}" -eq 0 ]]; then
  echo "OK: bilinen P0 TR literal taraması temiz"
  echo "qa-i18n-mail-web-gate: PASS"
  exit 0
fi

echo "WARN: olası hardcoded TR (ilk 25 satır):"
printf '%s\n' "${hits[@]:0:25}"
echo "qa-i18n-mail-web-gate: FAIL (${#hits[@]} hit)" >&2
exit 1
