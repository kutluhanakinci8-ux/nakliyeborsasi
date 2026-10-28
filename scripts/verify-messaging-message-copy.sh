#!/usr/bin/env bash
# Mesaj kopyala (panoya) — sohbet action bar.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
grep -q "IconCopy" "${ROOT}/apps/web/src/components/messaging/ChatMessageActionBar.tsx"
grep -q "buildCopyableMessageText" "${ROOT}/apps/web/src/components/messaging/MessagingConversationPanel.tsx"
grep -q "copyTextToClipboard" "${ROOT}/apps/web/src/lib/messagingMessageCopy.ts"
echo "verify-messaging-message-copy: PASS"
