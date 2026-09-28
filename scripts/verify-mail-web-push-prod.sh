#!/usr/bin/env bash
# Ops: VAPID + mail/messaging push yapılandırması kontrolü
set -euo pipefail
ENV_FILE="${1:-/var/www/nakliyeborsasi/.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ENV dosyası bulunamadı: $ENV_FILE"
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"
missing=0
for key in MAIL_WEB_PUSH_VAPID_PUBLIC_KEY MAIL_WEB_PUSH_VAPID_PRIVATE_KEY MAIL_WEB_PUSH_VAPID_SUBJECT; do
  if [[ -z "${!key:-}" ]]; then
    echo "Eksik: $key"
    missing=1
  fi
done
if [[ $missing -eq 1 ]]; then
  echo "Push prod için VAPID anahtarları gerekli."
  exit 1
fi
echo "OK: Mail web push VAPID tanımlı."
if [[ -n "${MESSAGING_WEB_PUSH_VAPID_PUBLIC_KEY:-}" ]]; then
  echo "OK: Messaging push VAPID (özel) tanımlı."
else
  echo "Bilgi: Sohbet push mail VAPID anahtarlarını paylaşır."
fi
