# STT-OSS-0 — Karar kaydı

- **Strateji:** OpenAI zorunlu değil; VPS içi Whisper uyumlu HTTP (MIT stack).
- **Motor:** `faster_whisper` (Docker: `onerahmet/openai-whisper-asr-webservice`).
- **Model:** `base` (CPU VPS; TR için OSS-3’te `small` değerlendirilecek).
- **Ağ:** Yalnızca `127.0.0.1:9010` (Nest API loopback).
- **Lisans:** faster-whisper MIT; model ağırlıkları OpenAI Whisper MIT.

Sonraki faz: [VOICE-TRANSCRIBE-STT-OSS-1.md](./VOICE-TRANSCRIBE-STT-OSS-1.md)
