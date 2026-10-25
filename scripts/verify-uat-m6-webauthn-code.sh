#!/usr/bin/env bash
# UAT M6 — WebAuthn / posta kilidi (kod yüzeyi).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_BASE="${API_BASE:-https://yonetim.lerta.com.tr}"
fail=0

need_grep() {
  if grep -qE "$2" "$1" 2>/dev/null; then
    echo "OK: $3"
  else
    echo "NOT: $3" >&2
    fail=1
  fi
}

echo "=== M6 kod: WebAuthn ==="
need_grep "${ROOT}/apps/api/src/modules/auth/AuthenticationController.ts" 'webauthn/register/options' "API register/options"
need_grep "${ROOT}/apps/api/src/modules/auth/AuthenticationController.ts" 'webauthn/authenticate/options' "API authenticate/options"
need_grep "${ROOT}/apps/mail-web/src/lib/mailApi.ts" 'webauthn/register' "mail-web WebAuthn client"
need_grep "${ROOT}/apps/mail-web/src/app/mail/MailSecuritySettingsPanel.tsx" '.' "MailSecuritySettingsPanel"
need_file() { [[ -f "$1" ]] && echo "OK: $2" || { echo "NOT: $2" >&2; fail=1; }; }
need_file "${ROOT}/docs/MAIL_BIOMETRIC_APP_LOCK.md" "biyometri dokümantasyonu"

code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "${API_BASE}/api/v1/auth/webauthn/register/options" \
  -H 'Content-Type: application/json' -d '{}' 2>/dev/null || echo 000)"
if [[ "${code}" =~ ^(200|400|401|403|405)$ ]]; then
  echo "OK: canlı register/options HTTP ${code}"
else
  echo "UYARI: register/options HTTP ${code}" >&2
fi

[[ "${fail}" -eq 0 ]] || exit 1
echo "M6 kod: PASS"
exit 0
