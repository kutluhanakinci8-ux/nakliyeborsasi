#!/usr/bin/env bash
# VPS: Telegram / Mesajlar büyük ekler için S3 erişim doğrulaması.
set -euo pipefail
INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "SKIP: .env yok ($ENV_FILE)"
  exit 0
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
if [[ -z "${MESSAGING_ATTACHMENT_S3_BUCKET:-}" ]]; then
  echo "SKIP: MESSAGING_ATTACHMENT_S3_BUCKET tanımlı değil (≤10 MB yerel depo)"
  exit 0
fi
cd "${INSTALL_DIR}"
node scripts/messaging-attachment-s3-probe.mjs
