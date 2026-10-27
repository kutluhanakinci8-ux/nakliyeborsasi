# Messaging local STT (STT-OSS-1)

OpenAI-compatible transcription on loopback port **9010**.

```bash
docker compose -f infra/messaging-local-stt/docker-compose.yml up -d
curl -sS -X POST "http://127.0.0.1:9010/asr?task=transcribe&output=json" \
  -F "audio_file=@sample.ogg"
```

License: faster-whisper (MIT). See `docs/messaging/VOICE-TRANSCRIBE-STT-OSS-ROADMAP.md`.
