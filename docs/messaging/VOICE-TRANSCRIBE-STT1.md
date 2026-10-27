# Sesli mesaj transkripsiyon — STT-1 (manuel)

## Bayrak

- `MESSAGING_VOICE_TRANSCRIBE_FAZ1=1`
- Status: `messaging_voice_transcribe_manual_faz1`, `voiceNote.sttConfigured` (Whisper API anahtarı)

## Üretim (zorunlu)

VPS `.env`:

```bash
LERTA_MAIL_AI_COMPOSE_API_KEY=sk-...   # OpenAI Whisper
# isteğe bağlı: MESSAGING_VOICE_STT_API_URL, MESSAGING_VOICE_STT_MODEL
bash scripts/apply-messaging-voice-stt-vps-env.sh
pm2 restart nakliyeborsasi-api --update-env
bash scripts/verify-messaging-voice-stt-prod.sh
```

Kullanıcı: profil → bildirim/AI rızası (mesajlaşma STT için).

## STT motoru

- OpenAI Whisper uyumlu: `MESSAGING_VOICE_STT_API_URL` (opsiyonel)
- Varsayılan: `https://api.openai.com/v1/audio/transcriptions`
- API anahtarı: `LERTA_MAIL_AI_COMPOSE_API_KEY`
- Model: `MESSAGING_VOICE_STT_MODEL` (varsayılan `whisper-1`)

## Rıza

Kullanıcıda AI asistan rızası gerekir (`hasMessagingAiConsent` — posta AI ile aynı).

## API

`POST /messaging/threads/:threadId/messages/:messageId/attachments/:index/transcribe`

Body: `{ "kvkkConsentAcknowledged": true }`

## Şema

```bash
bash scripts/apply-messaging-voice-transcript-stt1-schema.sh
```

## Doğrulama

```bash
bash scripts/verify-messaging-voice-transcribe-stt1.sh
```
