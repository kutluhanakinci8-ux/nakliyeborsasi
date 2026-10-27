#!/usr/bin/env bash
# STT-OSS-1: yerel Whisper ASR container (docker compose).
set -euo pipefail
INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
COMPOSE_FILE="${INSTALL_DIR}/infra/messaging-local-stt/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "HATA: docker yüklü değil — STT-OSS-1 için Docker gerekli." >&2
  exit 1
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "HATA: ${COMPOSE_FILE} bulunamadı (git pull main?)" >&2
  exit 1
fi

echo "=== STT local: docker compose pull ==="
docker compose -f "${COMPOSE_FILE}" pull

echo "=== STT local: docker compose up -d ==="
docker compose -f "${COMPOSE_FILE}" up -d

echo "=== STT local: port 9010 bekleniyor (max 120s) ==="
for _ in $(seq 1 60); do
  if (echo >/dev/tcp/127.0.0.1/9010) 2>/dev/null \
    || curl -fsS -o /dev/null --max-time 2 "http://127.0.0.1:9010/docs" 2>/dev/null \
    || curl -fsS -o /dev/null --max-time 2 "http://127.0.0.1:9010/" 2>/dev/null; then
    echo "OK: STT HTTP yanıt veriyor"
    docker compose -f "${COMPOSE_FILE}" ps
    exit 0
  fi
  sleep 2
done

echo "UYARI: 9010 henüz hazır değil — ilk model indirmesi uzun sürebilir; tekrar: bash scripts/verify-messaging-voice-stt-local.sh" >&2
docker compose -f "${COMPOSE_FILE}" ps
exit 0
