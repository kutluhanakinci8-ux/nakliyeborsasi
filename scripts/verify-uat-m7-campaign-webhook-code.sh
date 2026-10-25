#!/usr/bin/env bash
# UAT M7 — Kampanya A/B + engagement webhook (kod yüzeyi).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail=0

need_grep() {
  if grep -qE "$2" "$1" 2>/dev/null; then
    echo "OK: $3"
  else
    echo "NOT: $3 — $1" >&2
    fail=1
  fi
}

echo "=== M7 kod: kampanya A/B + webhook ==="
need_grep "${ROOT}/apps/api/src/modules/notification/MailOrganizationIntegrationService.ts" 'campaign\.opened' "webhook campaign.opened"
need_grep "${ROOT}/apps/api/src/modules/notification/MailOrganizationIntegrationService.ts" 'message\.opened' "webhook message.opened"
need_grep "${ROOT}/apps/api/src/modules/notification/MailMarketingCampaignService.ts" 'abStats' "kampanya abStats"
need_grep "${ROOT}/apps/mail-web/src/app/mail/MailCampaignHistoryPanel.tsx" 'abStats' "UI abStats"
need_grep "${ROOT}/apps/mail-web/src/app/mail/MailCampaignHistoryPanel.tsx" 'subjectB' "UI A/B subjectB"
need_grep "${ROOT}/apps/mail-web/src/app/mail/MailDeliverabilityPanel.tsx" 'engagementWebhookEvents' "teslimat webhook analitik"
need_grep "${ROOT}/apps/mail-web/src/app/mail/MailCampaignBlockEditor.tsx" '.' "kampanya blok editörü"
need_grep "${ROOT}/apps/api/src/modules/notification/ComposeCampaignRequestDto.ts" 'subjectB' "DTO A/B subjectB"

[[ "${fail}" -eq 0 ]] || exit 1
echo "M7 kod: PASS (canlı webhook URL — entegrasyon ayarları sonra)"
exit 0
