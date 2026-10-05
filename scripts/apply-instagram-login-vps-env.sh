#!/usr/bin/env bash
# VPS: Instagram Business Login (instagram.com/oauth) — Meta App ID kullanılmaz.
# Meta Developer → Instagram → API setup with Instagram login → Business login settings
#
#   SOCIAL_META_INSTAGRAM_APP_ID=... \
#   SOCIAL_META_INSTAGRAM_APP_SECRET=... \
#   bash scripts/apply-instagram-login-vps-env.sh
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"
IG_ID="${SOCIAL_META_INSTAGRAM_APP_ID:-}"
IG_SECRET="${SOCIAL_META_INSTAGRAM_APP_SECRET:-}"

if [[ -z "${IG_ID}" || -z "${IG_SECRET}" ]]; then
  echo "HATA: SOCIAL_META_INSTAGRAM_APP_ID ve SOCIAL_META_INSTAGRAM_APP_SECRET gerekli." >&2
  echo "Kaynak: Meta App Dashboard → Instagram → Business login settings" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "HATA: ${ENV_FILE} bulunamadı." >&2
  exit 1
fi

set_kv() {
  python3 - "${ENV_FILE}" "$1" "$2" <<'PY'
import sys
path, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
lines = open(path, encoding="utf-8").read().splitlines() if __import__("os").path.isfile(path) else []
out, found = [], False
for line in lines:
    if line.startswith(key + "="):
        out.append(f"{key}={value}")
        found = True
    else:
        out.append(line)
if not found:
    out.append(f"{key}={value}")
open(path, "w", encoding="utf-8").write("\n".join(out) + "\n")
PY
}

set_kv "SOCIAL_META_INSTAGRAM_APP_ID" "${IG_ID}"
set_kv "SOCIAL_META_INSTAGRAM_APP_SECRET" "${IG_SECRET}"
set_kv "SOCIAL_META_INSTAGRAM_OAUTH_USE_LOGIN" "1"

if command -v pm2 >/dev/null 2>&1 && pm2 describe nakliyeborsasi-api >/dev/null 2>&1; then
  pm2 restart nakliyeborsasi-api --update-env
fi

echo "OK: Instagram Business Login env (app id ${IG_ID})"
