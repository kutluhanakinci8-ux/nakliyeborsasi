#!/usr/bin/env bash
# SSO handoff: embed + embedHub query'lerinin /mail'e taşınması (Faz 0).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONSUME="${ROOT}/apps/mail-web/src/app/auth/consume/page.tsx"
URL="${ROOT}/apps/web/src/lib/MailWebUrl.ts"

grep -q 'query.set("embed", "1")' "$CONSUME" || {
  echo "FAIL: auth/consume must forward embed=1 to /mail" >&2
  exit 1
}
grep -q 'query.set("embedHub", "1")' "$CONSUME" || {
  echo "FAIL: auth/consume must forward embedHub=1 to /mail" >&2
  exit 1
}
grep -q 'embedHub' "$URL" || {
  echo "FAIL: MailWebUrl must support embedHubShell" >&2
  exit 1
}
grep -q 'shellBrand' "$CONSUME" || {
  echo "FAIL: auth/consume must forward shellBrand to /mail" >&2
  exit 1
}
grep -q 'MailEkolojikWebmailBranding' "$ROOT/apps/api/src/modules/notification/CompanyMailInboxController.ts" || {
  echo "FAIL: branding endpoint must apply Ekolojik webmail branding" >&2
  exit 1
}
echo "OK: mail embed SSO query chain"
