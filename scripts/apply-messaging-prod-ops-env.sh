#!/usr/bin/env bash
# Prod ops: SSE instance kimliği + (mevcutsa) test JWT env anahtarları dokunulmaz.
set -euo pipefail
INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"
[[ -f "${ENV_FILE}" ]] || exit 0

INSTANCE_ID="$(hostname -f 2>/dev/null || hostname || echo "vps")"
if ! grep -q '^MESSAGING_SSE_INSTANCE_ID=' "${ENV_FILE}"; then
  echo "MESSAGING_SSE_INSTANCE_ID=${INSTANCE_ID}" >> "${ENV_FILE}"
  echo "OK: MESSAGING_SSE_INSTANCE_ID=${INSTANCE_ID}"
elif grep -q '^MESSAGING_SSE_INSTANCE_ID=local$' "${ENV_FILE}"; then
  sed -i "s/^MESSAGING_SSE_INSTANCE_ID=.*/MESSAGING_SSE_INSTANCE_ID=${INSTANCE_ID}/" "${ENV_FILE}"
  echo "OK: MESSAGING_SSE_INSTANCE_ID güncellendi → ${INSTANCE_ID}"
fi

if ! grep -q '^MESSAGING_SSE_REDIS_FANOUT=' "${ENV_FILE}"; then
  echo "MESSAGING_SSE_REDIS_FANOUT=1" >> "${ENV_FILE}"
  echo "OK: MESSAGING_SSE_REDIS_FANOUT=1"
fi
