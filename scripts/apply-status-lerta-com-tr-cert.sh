#!/usr/bin/env bash
# status.lerta.com.tr — DNS doğrulama + Let's Encrypt + nginx 302 → /durum
set -euo pipefail

STATUS_HOST="${STATUS_HOST:-status.lerta.com.tr}"
EXPECTED_IP="${EXPECTED_IP:-168.231.109.27}"
CERTBOT_WEBROOT="${CERTBOT_WEBROOT:-/var/www/certbot}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-destek@lerta.com.tr}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "root ile çalıştırın." >&2
  exit 1
fi

resolved="$(dig +short "${STATUS_HOST}" A | head -1 || true)"
if [[ "${resolved}" != "${EXPECTED_IP}" ]]; then
  echo "DNS hazır değil: ${STATUS_HOST} A=${resolved:-yok} (beklenen ${EXPECTED_IP})" >&2
  echo "isimtescil: A kaydı status → ${EXPECTED_IP} (bkz. docs/DNS_LERTA_COM_TR_KURUMSAL_ISIMTESCIL.md §2.5)" >&2
  exit 2
fi

mkdir -p "${CERTBOT_WEBROOT}"

if [[ ! -f "/etc/letsencrypt/live/${STATUS_HOST}/fullchain.pem" ]]; then
  certbot certonly --webroot -w "${CERTBOT_WEBROOT}" \
    -d "${STATUS_HOST}" \
    --non-interactive --agree-tos -m "${CERTBOT_EMAIL}" \
    || {
      echo "certbot başarısız — DNS propagasyonunu kontrol edin." >&2
      exit 3
    }
fi

bash "${ROOT}/scripts/nginx-status-lerta-com-tr.sh"
echo "OK: https://${STATUS_HOST} → https://www.lerta.com.tr/durum"
