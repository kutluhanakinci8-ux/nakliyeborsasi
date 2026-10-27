#!/usr/bin/env bash
# STT-OSS-1: yerel Whisper ASR container (docker compose).
set -euo pipefail
INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
COMPOSE_FILE="${INSTALL_DIR}/infra/messaging-local-stt/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "HATA: docker yüklü değil — STT-OSS-1 için Docker gerekli." >&2
  exit 1
fi

STT_IMAGE="${MESSAGING_STT_DOCKER_IMAGE:-onerahmet/openai-whisper-asr-webservice:latest}"
STT_CONTAINER="${MESSAGING_STT_CONTAINER_NAME:-lerta-messaging-local-stt}"

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "${COMPOSE_FILE}" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "${COMPOSE_FILE}" "$@"
  else
    return 1
  fi
}

start_with_docker_run() {
  echo "=== STT local: docker run (compose yok) ==="
  docker pull "${STT_IMAGE}"
  docker rm -f "${STT_CONTAINER}" 2>/dev/null || true
  docker run -d \
    --name "${STT_CONTAINER}" \
    --restart unless-stopped \
    -p "127.0.0.1:9010:9000" \
    -e "ASR_ENGINE=faster_whisper" \
    -e "ASR_MODEL=base" \
    "${STT_IMAGE}"
}

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "HATA: ${COMPOSE_FILE} bulunamadı (git pull main?)" >&2
  exit 1
fi

if compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1; then
  echo "=== STT local: compose pull ==="
  compose pull
  echo "=== STT local: compose up -d ==="
  compose up -d
else
  start_with_docker_run
fi

echo "=== STT local: port 9010 bekleniyor (max 120s) ==="
for _ in $(seq 1 60); do
  if (echo >/dev/tcp/127.0.0.1/9010) 2>/dev/null \
    || curl -fsS -o /dev/null --max-time 2 "http://127.0.0.1:9010/docs" 2>/dev/null \
    || curl -fsS -o /dev/null --max-time 2 "http://127.0.0.1:9010/" 2>/dev/null; then
    echo "OK: STT HTTP yanıt veriyor"
    if compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1; then
      compose ps
    else
      docker ps --filter "name=${STT_CONTAINER}"
    fi
    exit 0
  fi
  sleep 2
done

echo "UYARI: 9010 henüz hazır değil — ilk model indirmesi uzun sürebilir; tekrar: bash scripts/verify-messaging-voice-stt-local.sh" >&2
if compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1; then
  compose ps
else
  docker ps --filter "name=${STT_CONTAINER}"
fi
exit 0
