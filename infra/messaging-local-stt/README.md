# Messaging local STT (STT-OSS-1)

OpenAI-compatible transcription on loopback port **9010**.

```bash
docker compose -f infra/messaging-local-stt/docker-compose.yml up -d
curl -sS -X POST "http://127.0.0.1:9010/v1/audio/transcriptions" \
  -H "Authorization: Bearer local-stt-internal" \
  -F "file=@sample.ogg" -F "model=base"
```

License: faster-whisper (MIT). See `docs/messaging/VOICE-TRANSCRIBE-STT-OSS-ROADMAP.md`.
