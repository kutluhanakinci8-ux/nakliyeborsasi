#!/usr/bin/env bash
# Ops: Sohbet push VAPID izolasyonu (mail VAPID ile aynı olmamalı).
set -euo pipefail
ENV_FILE="${1:-/var/www/nakliyeborsasi/.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ENV dosyası bulunamadı: $ENV_FILE"
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"
missing=0
for key in MESSAGING_WEB_PUSH_VAPID_PUBLIC_KEY MESSAGING_WEB_PUSH_VAPID_PRIVATE_KEY; do
  if [[ -z "${!key:-}" ]]; then
    echo "Eksik: $key (bash scripts/apply-messaging-web-push-vps-env.sh)"
    missing=1
  fi
done
if [[ $missing -eq 1 ]]; then
  exit 1
fi
echo "OK: Messaging push VAPID tanımlı."
if [[ -n "${MAIL_WEB_PUSH_VAPID_PUBLIC_KEY:-}" ]]; then
  if [[ "${MESSAGING_WEB_PUSH_VAPID_PUBLIC_KEY}" == "${MAIL_WEB_PUSH_VAPID_PUBLIC_KEY}" ]]; then
    echo "NOT: Sohbet ve mail public VAPID aynı — izolasyon için apply-messaging-web-push-vps-env.sh çalıştırın" >&2
    exit 2
  fi
  echo "OK: Mail VAPID ile ayrı (izolasyon)"
fi
if [[ "${MESSAGING_WEB_PUSH_ALLOW_MAIL_FALLBACK:-false}" == "true" ]]; then
  echo "UYARI: MESSAGING_WEB_PUSH_ALLOW_MAIL_FALLBACK=true — prod izolasyonu kapalı"
fi
echo "OK: messaging push verify"
