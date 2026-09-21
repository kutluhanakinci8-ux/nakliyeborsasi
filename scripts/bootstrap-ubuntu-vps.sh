#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
REPO_URL="${2:-https://github.com/kutluhanakinci8-ux/nakliyeborsasi.git}"
BRANCH="${3:-cursor/modular-freight-platform-18ba}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y git curl ca-certificates postgresql postgresql-contrib redis-server

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

service postgresql start
service redis-server start

sudo -u postgres psql -c "CREATE USER nakliyeborsasi WITH PASSWORD 'nakliyeborsasi';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE nakliyeborsasi OWNER nakliyeborsasi;" 2>/dev/null || true
sudo -u postgres psql -d nakliyeborsasi -c "GRANT ALL ON SCHEMA public TO nakliyeborsasi;" 2>/dev/null || true

mkdir -p "$(dirname "$INSTALL_DIR")"
if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
else
  cd "$INSTALL_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
fi

cd "$INSTALL_DIR"
cp -n .env.example .env
if grep -q 'JWT_SECRET=change-me' .env; then
  JWT_SECRET="$(openssl rand -hex 32)"
  sed -i "s/JWT_SECRET=change-me-in-production-use-long-random-string/JWT_SECRET=${JWT_SECRET}/" .env
fi

npm install
npm run build
bash scripts/diagnose-port.sh 3000 || true

echo ""
echo "Kurulum tamam. API'yi başlatmak için (port 3000'i temizler + build + start):"
echo "  cd $INSTALL_DIR && bash scripts/restart-api.sh"
echo ""
echo "Manuel:"
echo "  cd $INSTALL_DIR && npm run start"
echo "Sağlık (JSON olmalı): curl -s http://127.0.0.1:3000/api/v1/health"
