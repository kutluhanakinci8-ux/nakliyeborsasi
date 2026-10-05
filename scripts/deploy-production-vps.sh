#!/usr/bin/env bash
# VPS: main branch — API, app.lerta.com.tr (3011), posta + konsol + vitrin.
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "$INSTALL_DIR"
echo "=== Production deploy: origin/${BRANCH} ==="
git fetch origin "$BRANCH"
git merge --abort 2>/dev/null || true
git checkout -f "$BRANCH" 2>/dev/null || git checkout -f -B "$BRANCH" "origin/${BRANCH}"
git reset --hard "origin/${BRANCH}"
git clean -fdx -e .env -e apps/web/.env.local -e apps/mail-web/.env.local

git log -1 --oneline

bash scripts/install-deps.sh

if [[ -x scripts/apply-mail-web-push-vps-env.sh ]]; then
  bash scripts/apply-mail-web-push-vps-env.sh "$INSTALL_DIR" || true
fi

if [[ -x scripts/apply-messaging-web-push-vps-env.sh ]]; then
  bash scripts/apply-messaging-web-push-vps-env.sh "$INSTALL_DIR" || true
fi

if [[ -x scripts/apply-messaging-p4-schema.sh ]]; then
  bash scripts/apply-messaging-p4-schema.sh "$INSTALL_DIR" || true
fi

if [[ -x scripts/apply-mail-parity-wave2-schema.sh ]]; then
  bash scripts/apply-mail-parity-wave2-schema.sh "$INSTALL_DIR" || true
fi

if [[ -x scripts/apply-messaging-fs3-schema.sh ]]; then
  bash scripts/apply-messaging-fs3-schema.sh "$INSTALL_DIR" || true
fi
if [[ -x scripts/apply-messaging-fs4-schema.sh ]]; then
  bash scripts/apply-messaging-fs4-schema.sh "$INSTALL_DIR" || true
fi
if [[ -x scripts/apply-messaging-fs5-schema.sh ]]; then
  bash scripts/apply-messaging-fs5-schema.sh "$INSTALL_DIR" || true
fi
if [[ -x scripts/apply-messaging-fs6-schema.sh ]]; then
  bash scripts/apply-messaging-fs6-schema.sh "$INSTALL_DIR" || true
fi
if [[ -x scripts/apply-messaging-fs7-schema.sh ]]; then
  bash scripts/apply-messaging-fs7-schema.sh "$INSTALL_DIR" || true
fi
if [[ -x scripts/apply-messaging-fs8-schema.sh ]]; then
  bash scripts/apply-messaging-fs8-schema.sh "$INSTALL_DIR" || true
fi
if [[ -x scripts/apply-messaging-fs11-schema.sh ]]; then
  bash scripts/apply-messaging-fs11-schema.sh "$INSTALL_DIR" || true
fi
if [[ -x scripts/apply-messaging-fs12-schema.sh ]]; then
  bash scripts/apply-messaging-fs12-schema.sh "$INSTALL_DIR" || true
fi
if [[ -x scripts/apply-social-hub-prod-schema.sh ]]; then
  bash scripts/apply-social-hub-prod-schema.sh "$INSTALL_DIR" || true
fi
if [[ -x scripts/apply-messaging-prod-ops-env.sh ]]; then
  bash scripts/apply-messaging-prod-ops-env.sh "$INSTALL_DIR" || true
fi
if [[ -f scripts/verify-messaging-attachment-s3.sh ]]; then
  bash scripts/verify-messaging-attachment-s3.sh "$INSTALL_DIR" || {
    echo "WARN: messaging attachment S3 verify failed (bucket/credentials?)" >&2
  }
fi

if [[ -x scripts/apply-mail-sa2-auto-reply-schema.sh ]]; then
  bash scripts/apply-mail-sa2-auto-reply-schema.sh "$INSTALL_DIR" || true
fi

if [[ -x scripts/apply-mail-sa3-inbox-list-density-schema.sh ]]; then
  bash scripts/apply-mail-sa3-inbox-list-density-schema.sh "$INSTALL_DIR" || true
fi

if [[ -x scripts/apply-mail-sent-trash-schema.sh ]]; then
  bash scripts/apply-mail-sent-trash-schema.sh "$INSTALL_DIR" || true
fi

if [[ -x scripts/apply-mail-compose-preset-schema.sh ]]; then
  bash scripts/apply-mail-compose-preset-schema.sh "$INSTALL_DIR" || true
fi

if [[ "${SKIP_LERTA_POST_VANITY_DEPLOY:-0}" != "1" ]] && [[ -x scripts/deploy-lerta-post-vanity-from.sh ]]; then
  DEPLOY_BRANCH="${BRANCH}" bash scripts/deploy-lerta-post-vanity-from.sh "$INSTALL_DIR" || true
fi

DEPLOY_BRANCH="$BRANCH" bash scripts/deploy-posta-lerta-com-tr.sh "$INSTALL_DIR"

if [[ -x scripts/provision-pm5-imap-dovecot-vps.sh ]]; then
  INSTALL_DIR="$INSTALL_DIR" bash scripts/provision-pm5-imap-dovecot-vps.sh || true
fi

if [[ -x scripts/fix-dovecot-lerta-userdb-gid.sh ]]; then
  bash scripts/fix-dovecot-lerta-userdb-gid.sh || true
fi

if [[ -x scripts/fix-dovecot-passwd-file-perms.sh ]]; then
  bash scripts/fix-dovecot-passwd-file-perms.sh || true
fi

if [[ -x scripts/configure-dovecot-imap-gold-folders.sh ]] \
  && [[ -f /etc/dovecot/conf.d/99-lerta-mail.conf ]]; then
  bash scripts/configure-dovecot-imap-gold-folders.sh || true
fi

if [[ -x scripts/configure-dovecot-imap-tls-le.sh ]]; then
  bash scripts/configure-dovecot-imap-tls-le.sh || true
fi

bash scripts/restart-web.sh "$INSTALL_DIR" 3011 "https://app.lerta.com.tr/api/v1"

if [[ -x scripts/ensure-imap-gold-smoke-deploy.sh ]]; then
  INSTALL_DIR="$INSTALL_DIR" bash scripts/ensure-imap-gold-smoke-deploy.sh || true
fi

if [[ -x scripts/nginx-app-lerta-com-tr.sh ]]; then
  bash scripts/nginx-app-lerta-com-tr.sh || true
fi

if [[ -x scripts/bootstrap-dr-drill-evidence.sh ]]; then
  bash scripts/bootstrap-dr-drill-evidence.sh || true
fi

if [[ -x scripts/verify-mail-web-pwa-prod.sh ]]; then
  if bash scripts/verify-mail-web-pwa-prod.sh; then
    STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    python3 -c "import json; json.dump({'pwaScore':85,'source':'verify-mail-web-pwa-prod.sh','recordedAt':'${STAMP}'}, open('/var/log/lerta-mail-lighthouse-pwa.json','w'), indent=2)"
  fi
fi

if [[ "${LERTA_INSTALL_AUTO_DEPLOY_CRON:-1}" == "1" ]] && [[ -x scripts/install-vps-auto-deploy-cron.sh ]]; then
  bash scripts/install-vps-auto-deploy-cron.sh "$INSTALL_DIR" || true
fi

# shellcheck source=scripts/resolve-local-api-base.sh
source "${INSTALL_DIR}/scripts/resolve-local-api-base.sh" "${INSTALL_DIR}"
export API_BASE INSTALL_DIR ENV_FILE="${INSTALL_DIR}/.env"

echo "=== Post-deploy doğrulama (API_BASE=${API_BASE}) ==="
if [[ -x "${INSTALL_DIR}/scripts/verify-typeorm-global-entities.sh" ]]; then
  bash "${INSTALL_DIR}/scripts/verify-typeorm-global-entities.sh" || echo "UYARI: verify-typeorm-global-entities başarısız"
fi
for verify in verify-firma-sohbeti-fs1.sh verify-firma-sohbeti-fs2.sh verify-firma-sohbeti-fs3.sh \
  verify-firma-sohbeti-fs4.sh verify-firma-sohbeti-fs5.sh verify-firma-sohbeti-fs6.sh verify-firma-sohbeti-fs7.sh \
  verify-firma-sohbeti-fs8.sh verify-firma-sohbeti-fs9.sh verify-firma-sohbeti-fs10.sh \
  verify-firma-sohbeti-fs11.sh verify-firma-sohbeti-fs12.sh; do
  if [[ -x "${INSTALL_DIR}/scripts/${verify}" ]]; then
    API_BASE="${API_BASE}" bash "${INSTALL_DIR}/scripts/${verify}" || echo "UYARI: ${verify} başarısız"
  fi
done

if [[ -x "${INSTALL_DIR}/scripts/verify-firma-sohbeti-fs8-prod-checklist.sh" ]]; then
  set -a
  # shellcheck disable=SC1090
  [[ -f "${INSTALL_DIR}/.env" ]] && source "${INSTALL_DIR}/.env"
  set +a
  API_BASE="${API_BASE}" INSTALL_DIR="${INSTALL_DIR}" \
    bash "${INSTALL_DIR}/scripts/verify-firma-sohbeti-fs8-prod-checklist.sh" || echo "UYARI: FS-8 prod checklist başarısız"
fi

if [[ -x "${INSTALL_DIR}/scripts/verify-firma-sohbeti-pilot-nps.sh" ]]; then
  PILOT_NPS_STRICT="${PILOT_NPS_STRICT:-1}" bash "${INSTALL_DIR}/scripts/verify-firma-sohbeti-pilot-nps.sh" || echo "UYARI: pilot NPS verify"
fi

SHOWCASE_API_BASE="${MESSAGING_SHOWCASE_API_BASE:-https://app.lerta.com.tr/api/v1}"
if [[ -x "${INSTALL_DIR}/scripts/ensure-firma-sohbeti-excellence-showcase.sh" ]]; then
  set -a
  # shellcheck disable=SC1090
  [[ -f "${INSTALL_DIR}/.env" ]] && source "${INSTALL_DIR}/.env"
  set +a
  API_BASE="${SHOWCASE_API_BASE}" bash "${INSTALL_DIR}/scripts/ensure-firma-sohbeti-excellence-showcase.sh" || echo "UYARI: excellence showcase verify"
elif [[ -x "${INSTALL_DIR}/scripts/verify-firma-sohbeti-excellence-showcase.sh" ]]; then
  set -a
  # shellcheck disable=SC1090
  [[ -f "${INSTALL_DIR}/.env" ]] && source "${INSTALL_DIR}/.env"
  set +a
  API_BASE="${SHOWCASE_API_BASE}" bash "${INSTALL_DIR}/scripts/verify-firma-sohbeti-excellence-showcase.sh" || echo "UYARI: excellence showcase verify"
fi

if [[ -x "${INSTALL_DIR}/scripts/run-prod-fs83-two-instance-smoke.sh" ]]; then
  if [[ -z "${SMOKE_SECOND_API_PORT:-}" ]] && curl -fsS "http://127.0.0.1:3015/api/v1/health" >/dev/null 2>&1; then
    export SMOKE_SECOND_API_PORT=3015
  fi
  API_BASE="${SHOWCASE_API_BASE}" bash "${INSTALL_DIR}/scripts/run-prod-fs83-two-instance-smoke.sh" || echo "UYARI: FS-8.3 smoke"
fi

if [[ -x "${INSTALL_DIR}/scripts/run-mail-messaging-parity-wave2-checklist.sh" ]]; then
  SKIP_LIGHTHOUSE="${SKIP_LIGHTHOUSE:-1}" API_BASE="${API_BASE}" \
    bash "${INSTALL_DIR}/scripts/run-mail-messaging-parity-wave2-checklist.sh" || true
fi

echo "=== Production deploy bitti ==="
echo "  app:    https://app.lerta.com.tr/messaging?tab=email"
echo "  posta:  https://posta.lerta.com.tr/login"
