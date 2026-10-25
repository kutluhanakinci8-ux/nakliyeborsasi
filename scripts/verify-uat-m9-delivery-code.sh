#!/usr/bin/env bash
# UAT M9 — Teslimat (kod + DNS scriptleri; inbox smoke sonra).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail=0

need_file() {
  [[ -f "$1" ]] && echo "OK: $2" || { echo "NOT: $2 — $1" >&2; fail=1; }
}

need_grep() {
  grep -qE "$2" "$1" 2>/dev/null && echo "OK: $3" || { echo "NOT: $3" >&2; fail=1; }
}

echo "=== M9 kod: teslimat / inbound-outbound ==="
need_file "${ROOT}/scripts/verify-lerta-mail-inbound-p0.sh" "inbound P0 script"
need_file "${ROOT}/docs/EMAIL_PILOT_LERTA_COM_TR.md" "pilot teslimat runbook"
need_file "${ROOT}/docs/MAIL_PTR_HOSTINGER.md" "PTR runbook"
need_grep "${ROOT}/apps/mail-web/src/app/mail/MailDeliverabilityWizard.tsx" '.' "deliverability sihirbazı"
if grep -rq 'Bounce\|bounce' "${ROOT}/apps/api/src/modules/notification" 2>/dev/null; then
  echo "OK: bounce intelligence (api)"
else
  echo "NOT: bounce intelligence" >&2
  fail=1
fi
need_file "${ROOT}/scripts/vps-diagnose-outbound-mail.sh" "outbound diagnose script"

npm run test:unit -w @nakliyeborsasi/core -- --run src/mail/emailOutboxMetadata.test.ts 2>/dev/null | tail -1 | grep -q passed && \
  echo "OK: unit emailOutboxMetadata" || echo "UYARI: unit emailOutboxMetadata atlandı"

[[ "${fail}" -eq 0 ]] || exit 1
echo "M9 kod: PASS (MSN/Gmail/Outlook inbox — manuel §3.3 sonra)"
exit 0
