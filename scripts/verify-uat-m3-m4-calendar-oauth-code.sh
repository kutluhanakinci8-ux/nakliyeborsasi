#!/usr/bin/env bash
# UAT M3/M4 — Graph + Google takvim OAuth (kod; .env yapılandırması sonra).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail=0

need_file() {
  [[ -f "$1" ]] && echo "OK: $2" || { echo "NOT: $2 — $1" >&2; fail=1; }
}

need_grep() {
  grep -qE "$2" "$1" 2>/dev/null && echo "OK: $3" || { echo "NOT: $3" >&2; fail=1; }
}

echo "=== M3/M4 kod: takvim OAuth ==="
need_file "${ROOT}/apps/mail-web/src/app/mail/MailCalendarGraphPanel.tsx" "Graph takvim paneli"
need_file "${ROOT}/apps/mail-web/src/app/mail/MailCalendarGooglePanel.tsx" "Google takvim paneli"
need_file "${ROOT}/apps/mail-web/src/app/mail/exchange-oauth/page.tsx" "exchange-oauth callback"
need_file "${ROOT}/apps/mail-web/src/app/mail/calendar-oauth/page.tsx" "calendar-oauth callback"
need_file "${ROOT}/apps/mail-web/src/app/mail/google-calendar-oauth/page.tsx" "google-calendar-oauth callback"
need_file "${ROOT}/apps/api/src/modules/notification/MailCalendarGraphSyncService.ts" "Graph sync servisi"
need_file "${ROOT}/apps/api/src/modules/notification/MailCalendarGoogleSyncService.ts" "Google sync servisi"
need_file "${ROOT}/docs/MAIL_GRAPH_CALENDAR.md" "Graph dokümantasyonu"
need_file "${ROOT}/docs/MAIL_GOOGLE_CALENDAR.md" "Google dokümantasyonu"
need_file "${ROOT}/scripts/verify-uat-oauth-env.sh" "OAuth env doğrulama scripti"

[[ "${fail}" -eq 0 ]] || exit 1
echo "M3/M4 kod: PASS (VPS .env — MAIL_OAUTH_VPS_SETUP.md sonra)"
exit 0
