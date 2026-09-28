#!/usr/bin/env bash
# PM-1…PM-10 parity kapanış — prod smoke (değişiklik yapmaz).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
MAILBOX_EMAIL="${PARITY_IMAP_TEST_EMAIL:-nakliyeborsasi@lerta.com.tr}"
FAIL=0

run_step() {
  local title="$1"
  shift
  echo ""
  echo "== ${title} =="
  if "$@"; then
    echo "OK"
  else
    echo "NOT: ${title}" >&2
    FAIL=1
  fi
}

echo "== Mail & Messaging parity close checklist =="

run_step "VPS deploy smoke" bash "${ROOT}/scripts/run-lerta-mail-vps-deploy-checklist.sh"
run_step "PWA shell v7" bash "${ROOT}/scripts/verify-mail-web-pwa-prod.sh"
run_step "JMAP bridge mount" bash "${ROOT}/scripts/verify-mail-jmap-bridge-prod.sh"

if [[ -f "${ENV_FILE}" ]]; then
  run_step "Push VAPID" bash "${ROOT}/scripts/verify-mail-web-push-prod.sh" "${ENV_FILE}"
  run_step "AI compose flags" bash "${ROOT}/scripts/verify-mail-ai-compose-prod.sh" "${ENV_FILE}"
else
  echo ""
  echo "SKIP: ${ENV_FILE} yok — push/AI verify (agent ortamı)"
fi

if [[ -f "${ENV_FILE}" ]] && [[ -x "${ROOT}/scripts/verify-dovecot-imap-pm5.sh" ]]; then
  run_step "PM-5 IMAP ${MAILBOX_EMAIL}" \
    bash "${ROOT}/scripts/verify-dovecot-imap-pm5.sh" "${MAILBOX_EMAIL}" "${ENV_FILE}"
fi

if [[ -n "${MAIL_JMAP_JWT:-${ACCESS_TOKEN:-}}" ]]; then
  run_step "JMAP smoke (JWT)" bash "${ROOT}/scripts/smoke-mail-jmap-bridge.sh"
else
  echo ""
  echo "SKIP: MAIL_JMAP_JWT yok — JMAP Email/query smoke atlandı"
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "Parity close checklist: PASS"
  exit 0
fi
echo "Parity close checklist: FAIL — docs/LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md" >&2
exit 1
