#!/usr/bin/env bash
# UAT M5 — iOS PWA + Web Push (kod yüzeyi; VAPID yapılandırması sonra).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
POSTA_BASE="${POSTA_BASE:-https://posta.lerta.com.tr}"
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
    echo "NOT: $3 — $1" >&2
    fail=1
  fi
}

echo "=== M5 kod: iOS PWA + push ==="
need_file "${ROOT}/apps/mail-web/public/sw.js" "service worker"
need_grep "${ROOT}/apps/mail-web/public/sw.js" 'addEventListener\("push"' "SW push handler"
need_grep "${ROOT}/apps/mail-web/public/manifest.webmanifest" '"display": "standalone"' "PWA standalone manifest"
need_file "${ROOT}/apps/mail-web/src/app/mail/MailNotificationsSettingsPanel.tsx" "bildirim ayarları UI"
need_grep "${ROOT}/apps/api/src/modules/notification/CompanyMailInboxController.ts" 'push-config' "API push-config"
need_grep "${ROOT}/apps/mail-web/src/lib/mailApi.ts" 'push/subscribe' "client push subscribe"
need_file "${ROOT}/docs/MAIL_WEB_PUSH_IOS.md" "iOS push dokümantasyonu"

code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 12 "${POSTA_BASE}/manifest.webmanifest" 2>/dev/null || echo 000)"
if [[ "${code}" == "200" ]]; then
  echo "OK: prod manifest HTTP 200"
else
  echo "UYARI: prod manifest HTTP ${code} (deploy sonra)" >&2
fi

if [[ "${fail}" -gt 0 ]]; then
  exit 1
fi
echo "M5 kod: PASS (VAPID env — apply-mail-web-push-vps-env.sh, sonra)"
exit 0
