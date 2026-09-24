#!/usr/bin/env bash
# VPS .env içine Gmail API (OAuth) anahtarlarını yazır.
# Client secret'ı repoya veya komut geçmişine koymayın.
#
# Sunucuda:
#   export GOOGLE_GMAIL_CLIENT_ID='....apps.googleusercontent.com'
#   read -s GOOGLE_GMAIL_CLIENT_SECRET && export GOOGLE_GMAIL_CLIENT_SECRET
#   bash scripts/vps-gmail-oauth-env.sh
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "HATA: $ENV_FILE bulunamadı" >&2
  exit 1
fi

if [[ -z "${GOOGLE_GMAIL_CLIENT_ID:-}" || -z "${GOOGLE_GMAIL_CLIENT_SECRET:-}" ]]; then
  echo "GOOGLE_GMAIL_CLIENT_ID ve GOOGLE_GMAIL_CLIENT_SECRET gerekli." >&2
  echo "Google Cloud → Credentials → OAuth Web client" >&2
  exit 1
fi

WEB_BASE="${WEB_PUBLIC_BASE_URL:-}"
if [[ -z "$WEB_BASE" ]] && grep -q '^WEB_PUBLIC_BASE_URL=' "$ENV_FILE"; then
  WEB_BASE="$(grep '^WEB_PUBLIC_BASE_URL=' "$ENV_FILE" | cut -d= -f2-)"
fi
WEB_BASE="${WEB_BASE:-https://168.231.109.27}"
REDIRECT_URI="${GOOGLE_GMAIL_OAUTH_REDIRECT_URI:-${WEB_BASE%/}/api/v1/platform-admin/gmail/oauth/callback}"

set_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

set_env "GOOGLE_GMAIL_CLIENT_ID" "$GOOGLE_GMAIL_CLIENT_ID"
set_env "GOOGLE_GMAIL_CLIENT_SECRET" "$GOOGLE_GMAIL_CLIENT_SECRET"
set_env "GOOGLE_GMAIL_OAUTH_REDIRECT_URI" "$REDIRECT_URI"

echo "Gmail OAuth .env güncellendi."
echo "Redirect URI (Google Console'da aynı olmalı): $REDIRECT_URI"
echo "API yeniden başlatın: cd $INSTALL_DIR && docker compose up -d --build api web"
