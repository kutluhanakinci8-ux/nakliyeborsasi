#!/usr/bin/env bash
# Posta login marka + vitrin URL'leri ile hizalı mı (statik grep).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail=0
grep -q 'loginBrand.*Lerta Posta' apps/mail-web/src/lib/mailLocale.ts || {
  echo "FAIL: loginBrand TR Lerta Posta"
  fail=1
}
grep -q 'mailVitrinLinks\|MAIL_VITRIN_NAV' apps/mail-web/src/app/login/page.tsx || {
  echo "FAIL: login should import mailVitrinLinks"
  fail=1
}
grep -q 'MAIL_VITRIN_NAV' apps/mail-web/src/lib/mailVitrinLinks.ts || {
  echo "FAIL: MAIL_VITRIN_NAV missing"
  fail=1
}
if [[ "$fail" -ne 0 ]]; then
  exit 1
fi
echo "verify-vitrin-posta-consistency: PASS"
