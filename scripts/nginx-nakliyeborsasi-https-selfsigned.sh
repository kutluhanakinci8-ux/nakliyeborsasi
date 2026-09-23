#!/usr/bin/env bash
# VPS: HTTPS (self-signed) reverse proxy — iPhone Safari geolocation için güvenli bağlam.
# Kullanım: sudo bash scripts/nginx-nakliyeborsasi-https-selfsigned.sh [SERVER_IP]
set -euo pipefail

SERVER_IP="${1:-168.231.109.27}"
WEB_PORT="${WEB_PORT:-3011}"
API_PORT="${API_PORT:-3010}"
CERT_DIR="/etc/ssl/nakliyeborsasi"
NGINX_SITE="/etc/nginx/sites-available/nakliyeborsasi-https.conf"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "root veya sudo ile çalıştırın." >&2
  exit 1
fi

mkdir -p "$CERT_DIR"
if [[ ! -f "$CERT_DIR/fullchain.pem" ]]; then
  openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -subj "/CN=${SERVER_IP}" \
    -addext "subjectAltName=IP:${SERVER_IP},DNS:${SERVER_IP}"
  chmod 600 "$CERT_DIR/privkey.pem"
  echo "Self-signed sertifika oluşturuldu: $CERT_DIR"
fi

cat > "$NGINX_SITE" <<EOF
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${SERVER_IP};

    ssl_certificate     ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;

    client_max_body_size 4m;

    location /api/v1/ {
        proxy_pass http://127.0.0.1:${API_PORT}/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:${WEB_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/nakliyeborsasi-https.conf
nginx -t
systemctl reload nginx
echo "OK: https://${SERVER_IP}/ → web :${WEB_PORT}, /api/v1 → :${API_PORT}"
echo "iPhone: Safari'de sertifika uyarısını onaylayın, sonra Konum izni verin."
