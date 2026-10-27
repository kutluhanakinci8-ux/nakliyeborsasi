# Ses → metin (OSS) — müşteri hazır checklist

OpenAI / Posta compose anahtarı **zorunlu değil** (self-hosted Whisper yolu).

## Ops (VPS)

- [ ] `docker ps` → `lerta-messaging-local-stt` çalışıyor (`127.0.0.1:9010`)
- [ ] `bash scripts/apply-messaging-voice-stt-local-vps-env.sh` + `pm2 restart nakliyeborsasi-api --update-env`
- [ ] `bash scripts/verify-messaging-voice-stt-oss-gate.sh` → PASS
- [ ] `bash scripts/benchmark-messaging-voice-stt-30s.sh` (ops, SLA rehberi)

## Ürün (kullanıcı)

- [ ] Mesaj → sesli mesaj → **Yazıya çevir** (STT yapılandırılmış uyarısı yok)
- [ ] **AI / ses işleme rızası** açık (sohbet şeridi veya Profil 02c)
- [ ] Köprü otomatik STT (firma `auto` + KVKK): WhatsApp/Telegram inbound ses → `bridge_inbound` transkript
- [ ] Yoğunluk: `stt-busy` → kullanıcı “tekrar deneyin” mesajı

## Güvenlik / uyum

- [ ] STT yalnızca loopback (dış ağa açık değil)
- [ ] Aylık kota: `MESSAGING_VOICE_STT_MONTHLY_QUOTA`
- [ ] Eşzamanlı limit: `MESSAGING_VOICE_STT_MAX_CONCURRENT`

## İzleme

- [ ] `GET /api/v1/messaging/integration/voice-stt/health`
- [ ] `/messaging/status` → `voiceNote.sttProvider`, `sttActiveJobs`

## Program tamamlandı (OSS-0→7)

| Faz | Konu |
|-----|------|
| OSS-0 | Karar |
| OSS-1 | Yerel Whisper servisi |
| OSS-2 | STT anahtarı ayrımı |
| OSS-6 | Mesaj içi AI rızası |
| OSS-3 | TR + glossary |
| OSS-4 | Concurrency + health |
| OSS-7 | Gate (bu checklist) |
| OSS-5 | Vosk (opsiyonel, ayrı pilot) |
