#!/usr/bin/env bash
# Kapanış sonrası — harici / müşteri bekleyen maddeler (FAIL üretmez).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DAY="$(TZ=Europe/Istanbul date +%Y-%m-%d)"
ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
[[ ! -f "${ENV_FILE}" && -f "${ROOT}/.env" ]] && ENV_FILE="${ROOT}/.env"

sign_tb="${UAT_M1_THUNDERBIRD_SIGNED:-0}"
sign_am="${UAT_M1_APPLE_SIGNED:-0}"
sign_m9="${UAT_M9_DELIVERY_SIGNED:-0}"
gcal="MISSING"
[[ -f "${ENV_FILE}" ]] && grep -qE '^GOOGLE_CALENDAR_CLIENT_ID=.+$' "${ENV_FILE}" && gcal="CONFIGURED"

echo "== Harici / müşteri bekleyen (${DAY}) =="
echo ""
echo "| Madde | Durum |"
echo "|-------|--------|"
echo "| 9c Thunderbird imza | $([[ ${sign_tb} == 1 ]] && echo SIGNED || echo BEKLİYOR) |"
echo "| 9c Apple Mail imza | $([[ ${sign_am} == 1 ]] && echo SIGNED || echo BEKLİYOR) |"
echo "| 9c M9 teslimat kutusu | $([[ ${sign_m9} == 1 ]] && echo SIGNED || echo BEKLİYOR) |"
echo "| M4 Google Takvim .env | ${gcal} |"
echo "| 7b Harici pentest | BEKLİYOR (checklist) |"
echo "| 8b SOC2/ISO denetim | BEKLİYOR |"
echo ""
echo "İmza sonrası: UAT_M1_THUNDERBIRD_SIGNED=1 UAT_M1_APPLE_SIGNED=1 UAT_M9_DELIVERY_SIGNED=1 npm run qa:faz9"
echo "run-external-pending-status: OK"
