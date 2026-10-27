# STT-OSS-1 — Yerel Whisper servisi (VPS)

## Bileşenler

- `infra/messaging-local-stt/docker-compose.yml` — loopback STT container
- `scripts/setup-messaging-stt-local-vps.sh` — `docker compose up -d`
- `scripts/apply-messaging-voice-stt-local-vps-env.sh` — API `.env`
- `scripts/verify-messaging-voice-stt-local.sh` — container + HTTP smoke

## VPS (sıra)

```bash
cd /var/www/nakliyeborsasi
git pull origin main
bash scripts/setup-messaging-stt-local-vps.sh
bash scripts/apply-messaging-voice-stt-local-vps-env.sh
pm2 restart nakliyeborsasi-api --update-env
bash scripts/verify-messaging-voice-stt-local.sh
bash scripts/verify-messaging-voice-stt-prod.sh
```

## Env

| Değişken | Örnek |
|----------|--------|
| `MESSAGING_VOICE_STT_API_URL` | `http://127.0.0.1:9010/v1/audio/transcriptions` |
| `MESSAGING_VOICE_STT_MODEL` | `base` |
| `LERTA_MAIL_AI_COMPOSE_API_KEY` | `local-stt-internal` (STT-OSS-2’de ayrılacak) |
| `MESSAGING_VOICE_STT_LOCAL_ENABLED` | `1` |

İlk `docker compose pull` model indirebilir (birkaç dakika).
