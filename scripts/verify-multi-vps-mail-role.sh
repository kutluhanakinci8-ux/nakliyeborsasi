#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"
role="${LERTA_MAIL_RUNTIME_ROLE:-all}"
echo "LERTA_MAIL_RUNTIME_ROLE=$role"
case "$role" in
  all|api|worker) echo "OK: geçerli rol" ;;
  *) echo "FAIL: geçersiz rol" >&2; exit 1 ;;
esac
if [[ "$role" == "api" ]]; then
  echo "NOT: worker düğümü outbox için gerekli — doğrulayın" >&2
  exit 1
fi
echo "OK"
