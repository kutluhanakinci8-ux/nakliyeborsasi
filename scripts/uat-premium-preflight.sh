#!/usr/bin/env bash
# UAT M1–M10: otomatik ön kontroller (Faz 6). M1–M5, M7–M9 müşteri/manuel imza gerektirir.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

POSTA_BASE="${POSTA_BASE:-https://posta.lerta.com.tr}"
APP_BASE="${APP_BASE:-https://app.lerta.com.tr}"
API_BASE="${API_BASE:-https://yonetim.lerta.com.tr}"

pass() { echo "PASS: $*"; }
fail() { echo "FAIL: $*" >&2; FAILED=1; }
warn() { echo "MANUAL: $*"; }

FAILED=0

echo "=== UAT preflight (Faz 6) ==="
echo "posta=${POSTA_BASE} app=${APP_BASE} api=${API_BASE}"

# M10 — PWA shell + Lighthouse (proxy fallback)
export POSTA_URL="${POSTA_BASE}"
if bash "${ROOT}/scripts/verify-mail-web-pwa-prod.sh"; then
  pass "M10 PWA prod shell"
else
  fail "M10 PWA prod shell"
fi
if LIGHTHOUSE_PWA_PROXY=1 bash "${ROOT}/scripts/verify-lighthouse-mail-pwa.sh" "${POSTA_BASE}/mail"; then
  pass "M10 Lighthouse PWA"
else
  fail "M10 Lighthouse PWA"
fi

# M6 — WebAuthn API yüzeyi (JWT olmadan 401/400 beklenir)
code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "${API_BASE}/api/v1/auth/webauthn/register/options" \
  -H 'Content-Type: application/json' -d '{}' 2>/dev/null || echo 000)"
if [[ "${code}" =~ ^(200|400|401|403|405)$ ]]; then
  pass "M6 webauthn register/options HTTP ${code}"
else
  fail "M6 webauthn register/options HTTP ${code}"
fi

# API health (M9 ön koşul — outbound/inbound ayrı manuel)
hcode="$(curl -sS -o /dev/null -w '%{http_code}' "${API_BASE}/api/v1/health" 2>/dev/null || echo 000)"
if [[ "${hcode}" == "200" ]]; then
  pass "API health"
else
  fail "API health HTTP ${hcode}"
fi

# TMS Next 15 (app shell)
acode="$(curl -sS -o /dev/null -w '%{http_code}' "${APP_BASE}/login" 2>/dev/null || echo 000)"
if [[ "${acode}" =~ ^(200|302|307)$ ]]; then
  pass "app login shell HTTP ${acode}"
else
  fail "app login shell HTTP ${acode}"
fi

echo ""
warn "M1 Thunderbird ↔ webmail IMAP — bash scripts/smoke-imap-gold.sh <mailbox> (VPS veya IMAP_GOLD_PASSWORD)"
warn "M2 Outlook mobil IMAP — manuel"
warn "M3 Graph takvim — OAuth VPS .env MICROSOFT_GRAPH_*"
warn "M4 Google takvim — GOOGLE_CALENDAR_*"
warn "M5 iOS PWA push — MAIL_WEB_PUSH_IOS.md"
warn "M7 kampanya A/B webhook — mail-marketing canlı test"
warn "M8 KVKK export — compliance panel"
warn "M9 MSN/Gmail/Outlook inbox — EMAIL_PILOT_LERTA_COM_TR.md §3.3"

if [[ "${FAILED}" -eq 0 ]]; then
  echo "=== UAT preflight: automated checks PASS (manuel kalemler yukarıda) ==="
  exit 0
fi
echo "=== UAT preflight: automated checks FAILED ===" >&2
exit 1
