#!/usr/bin/env bash
# UAT M8 — KVKK export, audit, suppression (kod yüzeyi).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail=0

need_file() {
  if [[ -f "$1" ]]; then
    echo "OK: $2"
  else
    echo "NOT: $2 — $1" >&2
    fail=1
  fi
}

need_grep() {
  if grep -qE "$2" "$1" 2>/dev/null; then
    echo "OK: $3"
  else
    echo "NOT: $3" >&2
    fail=1
  fi
}

echo "=== M8 kod: KVKK / compliance ==="
need_file "${ROOT}/apps/mail-web/src/app/mail/MailComplianceAuditPanel.tsx" "denetim paneli"
need_file "${ROOT}/apps/mail-web/src/app/mail/MailPrivacySettingsPanel.tsx" "gizlilik / KVKK export UI"
need_grep "${ROOT}/apps/api/src/modules/notification/CompanyMailInboxController.ts" 'compliance/audit' "API compliance audit"
need_grep "${ROOT}/apps/api/src/modules/notification/CompanyMailInboxController.ts" 'compliance/send-log/export' "API send-log export"
need_grep "${ROOT}/apps/api/src/modules/notification/CompanyMailIdentityController.ts" 'privacy/export' "API privacy export"
need_grep "${ROOT}/apps/mail-web/src/app/mail/MailDeliverabilityPanel.tsx" 'suppression' "suppression hub UI"
need_grep "${ROOT}/apps/mail-web/src/lib/mailApi.ts" 'compliance/audit' "client compliance API"

[[ "${fail}" -eq 0 ]] || exit 1
echo "M8 kod: PASS (operatör JWT / canlı export sonra)"
exit 0
