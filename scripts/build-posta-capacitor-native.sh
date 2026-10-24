#!/usr/bin/env bash
# Lerta Posta — Capacitor iOS/Android sync (mağaza öncesi).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAIL_WEB="${ROOT}/apps/mail-web"
cd "${MAIL_WEB}"

export CAPACITOR_POSTA_SERVER_URL="${CAPACITOR_POSTA_SERVER_URL:-https://posta.lerta.com.tr}"

echo "== mail-web build =="
npm run build

echo "== cap sync =="
npx cap sync

echo "OK: Capacitor sync (${CAPACITOR_POSTA_SERVER_URL})"
echo "iOS: cd apps/mail-web && npx cap open ios"
echo "Android: cd apps/mail-web && npx cap open android"
