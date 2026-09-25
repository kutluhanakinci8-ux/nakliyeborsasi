#!/usr/bin/env bash
# posta.lerta.com.tr → Lerta Mail SaaS (mail-web :3012 + API :3010)
set -euo pipefail

APP_HOST="${APP_HOST:-posta.lerta.com.tr}"
WEB_PORT="${WEB_PORT:-3012}"
API_PORT="${API_PORT:-3010}"
NGINX_SITE="/etc/nginx/sites-available/lerta-posta-mail-web.conf"
CERTBOT_WEBROOT="/var/www/certbot"
LE_DIR="/etc/letsencrypt/live/${APP_HOST}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "root ile çalıştırın." >&2
  exit 1
fi

mkdir -p "$CERTBOT_WEBROOT"

write_http() {
  cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${APP_HOST};

    location ^~ /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
        default_type text/plain;
    }

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
}

write_http_redirect_to_https() {
  cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${APP_HOST};

    location ^~ /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
        default_type text/plain;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF
}

write_https() {
  cat >> "$NGINX_SITE" <<EOF

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${APP_HOST};

    ssl_certificate ${LE_DIR}/fullchain.pem;
    ssl_certificate_key ${LE_DIR}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 16m;

    location /api/v1/ {
        proxy_pass http://127.0.0.1:${API_PORT}/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location / {
        proxy_pass http://127.0.0.1:${WEB_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
}

write_http
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/lerta-posta-mail-web.conf

# posta host adı başka projelerin (U88, Ekolojik vb.) nginx dosyasında olmamalı.
if grep -rl "${APP_HOST}" /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "lerta-posta-mail-web.conf" | grep -q .; then
  echo "HATA: ${APP_HOST} başka nginx site dosyasında da tanımlı (programlar karışır)." >&2
  grep -rl "${APP_HOST}" /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "lerta-posta-mail-web.conf" || true
  echo "Önce o dosyalardan ${APP_HOST} satırını kaldırın; Ekolojik/U88 yapılandırmasına dokunmayın." >&2
  exit 1
fi

nginx -t && systemctl reload nginx
echo "HTTP: http://${APP_HOST}/"
echo "NOT: HTTPS sertifikası yoksa tarayıcı https:// açınca varsayılan site (ör. Ekolojik) görünebilir — certbot adımını tamamlayın."

apply_tls_nginx() {
  write_http_redirect_to_https
  write_https
  nginx -t && systemctl reload nginx
  echo "HTTPS: https://${APP_HOST}/ (HTTP → HTTPS yönlendirme aktif)"
}

if [[ -f "${LE_DIR}/fullchain.pem" ]]; then
  apply_tls_nginx
  exit 0
fi

if command -v certbot >/dev/null 2>&1; then
  if certbot certonly --webroot -w "$CERTBOT_WEBROOT" -d "$APP_HOST" \
    --non-interactive --agree-tos --register-unsafely-without-email \
    --keep-until-expiring; then
    apply_tls_nginx
  else
    echo "UYARI: DNS A kaydı ${APP_HOST} → bu sunucu gerekli."
  fi
fi
