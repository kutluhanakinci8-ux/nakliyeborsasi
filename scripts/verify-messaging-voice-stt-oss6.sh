#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
grep -q "MessagingAiProcessingConsentCard" "${ROOT}/apps/web/src/components/messaging/MessagingAiProcessingConsentCard.tsx"
grep -q "aiMailAssistConsent" "${ROOT}/apps/web/src/components/messaging/MessagingAiProcessingConsentCard.tsx"
grep -q "MessagingAiProcessingConsentCard" "${ROOT}/apps/web/src/components/messaging/MessagingConversationPanel.tsx"
grep -q "profile-ai-consent" "${ROOT}/apps/web/src/app/(dashboard)/hesap/profil/ProfilePageClient.tsx"
echo "OK: STT-OSS-6 AI consent UI sources"
