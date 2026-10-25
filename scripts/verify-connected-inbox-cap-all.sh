#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${VERIFY_CONNECTED_REMOTE_SMOKE:-}" == "1" ]]; then
  echo "== CAP public endpoints (remote) =="
  bash scripts/verify-connected-inbox-cap8.sh
else
  echo "== CAP public endpoints: skipped (set VERIFY_CONNECTED_REMOTE_SMOKE=1 for live smoke) =="
fi

echo "== SQL migration files =="
for f in \
  scripts/sql/mail-connected-accounts-cap3.sql \
  scripts/sql/mail-connected-accounts-cap-gaps.sql \
  scripts/sql/mail-connected-accounts-cap-gaps-2.sql
do
  test -f "$f" || { echo "Missing $f" >&2; exit 1; }
done

echo "== API symbols (static grep) =="
grep -q 'class MailConnectedInboxActionsService' apps/api/src/modules/notification/MailConnectedInboxActionsService.ts
grep -q 'connected-inbox/status' apps/api/src/modules/notification/CompanyMailInboxController.ts
grep -q 'isPushConfigured' apps/api/src/modules/notification/MailGmailSyncService.ts
grep -q 'restoreMessageFromTrash' apps/api/src/modules/notification/MailExchangeGraphSyncService.ts
grep -q 'syncMailboxFolderState' apps/api/src/modules/notification/MailConnectedInboxActionsService.ts
grep -q 'MailConnectedInboxStatusPanel' apps/mail-web/src/app/mail/MailConnectedInboxStatusPanel.tsx

echo "OK: connected inbox CAP code bundle present"
