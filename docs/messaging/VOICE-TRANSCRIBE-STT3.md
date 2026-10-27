# STT-3 — Otomatik transkripsiyon

- Firma politikası: `manual` (varsayılan) | `auto`
- Sesli mesaj gönderiminde arka plan STT (`maybeAutoTranscribeAfterSend`)
- Aylık kota: `MESSAGING_VOICE_STT_MONTHLY_QUOTA` (varsayılan 500)
- Entegrasyon: `PATCH /messaging/integration/voice-transcribe`

Flag: `MESSAGING_VOICE_TRANSCRIBE_AUTO_FAZ3=1`  
STT-1 + yapılandırılmış `LERTA_MAIL_AI_COMPOSE_API_KEY` gerekli.
