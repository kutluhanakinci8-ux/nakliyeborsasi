#!/usr/bin/env bash
# Canlı posta sürümü ile origin/main (veya DEPLOY_BRANCH) uyumunu doğrular.
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
BRANCH="${DEPLOY_BRANCH:-main}"
ORIGIN_SHA="$(git -C "$INSTALL_DIR" fetch origin "$BRANCH" 2>/dev/null && git -C "$INSTALL_DIR" rev-parse "origin/${BRANCH}" 2>/dev/null || true)"
LOCAL_SHA="$(git -C "$INSTALL_DIR" rev-parse HEAD 2>/dev/null || true)"

if [[ -z "$LOCAL_SHA" ]]; then
  echo "HATA: VPS checkout SHA okunamadı ($INSTALL_DIR)" >&2
  exit 1
fi

if [[ -n "$ORIGIN_SHA" && "$LOCAL_SHA" != "$ORIGIN_SHA" ]]; then
  echo "HATA: VPS HEAD ($LOCAL_SHA) != origin/${BRANCH} ($ORIGIN_SHA)" >&2
  echo "Çözüm: DEPLOY_BRANCH=${BRANCH} bash scripts/deploy-production-vps.sh" >&2
  exit 1
fi

if [[ ! -f "$INSTALL_DIR/apps/mail-web/src/app/mail/MailInboxCommandBar.tsx" ]]; then
  echo "HATA: MailInboxCommandBar.tsx yok — posta filtre UI bu commit'te değil." >&2
  exit 1
fi

echo "OK: posta deploy revision ${LOCAL_SHA:0:7} (branch ${BRANCH})"
