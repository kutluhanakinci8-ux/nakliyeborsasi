#!/usr/bin/env bash
# Self-host OSRM (Turkey) on VPS — run on server as root after docker is installed.
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
DATA_DIR="${INSTALL_DIR}/routing-data"
PBF_URL="https://download.geofabrik.de/europe/turkey-latest.osm.pbf"
PBF_FILE="${DATA_DIR}/turkey-latest.osm.pbf"
OSRM_IMAGE="ghcr.io/project-osrm/osrm-backend:latest"

cd "$INSTALL_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "=== Docker kurulumu ==="
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io
  systemctl enable --now docker
fi

mkdir -p "$DATA_DIR"

if [[ ! -f "$PBF_FILE" ]]; then
  echo "=== Geofabrik Turkey PBF indiriliyor (birkaç dakika) ==="
  wget -q --show-progress -O "$PBF_FILE" "$PBF_URL"
fi

echo "=== OSRM extract (RAM yoğun, ~10–25 dk) ==="
docker run --rm -t -v "${DATA_DIR}:/data" "$OSRM_IMAGE" \
  osrm-extract -p /opt/car.lua "/data/turkey-latest.osm.pbf"

echo "=== OSRM partition ==="
docker run --rm -t -v "${DATA_DIR}:/data" "$OSRM_IMAGE" \
  osrm-partition "/data/turkey-latest.osrm"

echo "=== OSRM customize ==="
docker run --rm -t -v "${DATA_DIR}:/data" "$OSRM_IMAGE" \
  osrm-customize "/data/turkey-latest.osrm"

echo "=== OSRM routed (port 5000, localhost) ==="
docker rm -f nb-osrm-routed 2>/dev/null || true
docker run -d --name nb-osrm-routed --restart unless-stopped \
  -p 127.0.0.1:5000:5000 \
  -v "${DATA_DIR}:/data" \
  "$OSRM_IMAGE" \
  osrm-routed --algorithm mld /data/turkey-latest.osrm

echo "=== Test ==="
curl -sf "http://127.0.0.1:5000/nearest/v1/driving/32.8597,39.9334?number=1" | head -c 200
echo ""

ENV_FILE="${INSTALL_DIR}/.env"
if grep -q '^OSRM_BASE_URL=' "$ENV_FILE"; then
  sed -i 's|^OSRM_BASE_URL=.*|OSRM_BASE_URL=http://127.0.0.1:5000|' "$ENV_FILE"
else
  echo "OSRM_BASE_URL=http://127.0.0.1:5000" >> "$ENV_FILE"
fi
if grep -q '^OSRM_BASE_URL_TR=' "$ENV_FILE"; then
  sed -i 's|^OSRM_BASE_URL_TR=.*|OSRM_BASE_URL_TR=http://127.0.0.1:5000|' "$ENV_FILE"
else
  echo "OSRM_BASE_URL_TR=http://127.0.0.1:5000" >> "$ENV_FILE"
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart nakliyeborsasi-api --update-env || true
fi

echo "OK: OSRM hazır. API yeniden başlatıldı (OSRM_BASE_URL=http://127.0.0.1:5000)"
