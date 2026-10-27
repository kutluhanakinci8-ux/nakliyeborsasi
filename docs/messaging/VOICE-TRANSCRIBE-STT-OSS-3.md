# STT-OSS-3 — Türkçe kalite ve STT-2 entegrasyonu

## Amaç

Yerel Whisper motorunda TR dil varsayılanı, dosya tabanlı glossary ve mevcut STT-2 (confidence / arama) ile uyum; köprü otomatik STT aynı `MessagingVoiceTranscribeService` yolunu kullanır (`transcript_source=bridge_inbound`).

## Env

| Değişken | Örnek | Açıklama |
|----------|--------|----------|
| `MESSAGING_VOICE_STT_DEFAULT_LANGUAGE` | `tr` | Locale tanınmazsa Whisper `language` |
| `MESSAGING_VOICE_STT_GLOSSARY_PATH` | `/var/www/.../voice-stt-glossary-tr.json` | JSON kural listesi (built-in lojistik sözlüğe ek) |
| `MESSAGING_VOICE_STT_TR_QUALITY_FAZ1` | `1` | Feature `messaging_voice_stt_tr_quality_faz1`; glossary yerel STT’de de uygulanır |

Glossary JSON örneği: `data/messaging/voice-stt-glossary-tr.json`

```json
[{ "pattern": "\\bnakliye\\b", "replacement": "nakliye", "flags": "gi" }]
```

## SLA (30 sn sesli mesaj)

Referans: VPS `base` model, ~2 vCPU, loopback STT.

| Metrik | Hedef (rehber) |
|--------|----------------|
| 30 sn `voice_note` → ilk transkript | &lt; 120 sn (CPU); `small` modelde daha uzun |
| API timeout | Nest fetch — büyük dosyalarda kullanıcıya “bekleyin” UX (STT-OSS-4) |

Ölçüm: `scripts/benchmark-messaging-voice-stt-30s.sh` (ops, ffmpeg gerekir).

## Doğrulama

```bash
bash scripts/verify-messaging-voice-stt-oss3.sh
bash scripts/verify-messaging-voice-transcribe-br1.sh
```

Prod: `/messaging/status` → `voiceNote.sttDefaultLanguage: "tr"`, `sttTrQualityFaz1Enabled: true`, feature `messaging_voice_stt_tr_quality_faz1`.

Köprü: firma `voiceTranscribeMode=auto` + KVKK + `MESSAGING_VOICE_BRIDGE_STT_FAZ1=1` → inbound ses `bridge_inbound`.

## Deploy

`scripts/apply-messaging-voice-stt-local-vps-env.sh` OSS-3 satırlarını ekler; `pm2 restart nakliyeborsasi-api --update-env`.
