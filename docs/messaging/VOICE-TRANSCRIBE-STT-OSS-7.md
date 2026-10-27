# STT-OSS-7 — Kapanış ve parity gate

## Gate komutu

```bash
bash scripts/verify-messaging-voice-stt-oss-gate.sh
```

Prod / u88:

```bash
API_BASE=https://u88.lerta.com.tr/api/v1 bash scripts/verify-messaging-voice-stt-oss-gate.sh
```

## Status beklentisi

- Feature: `messaging_voice_stt_oss_gate_faz7` (`MESSAGING_VOICE_STT_OSS_GATE_FAZ7=1`)
- `voiceNote.sttConfigured: true`, `sttProvider: local` (self-hosted yol)
- `sttDefaultLanguage: tr`, `sttTrQualityFaz1Enabled`, `sttReliabilityFaz1Enabled`
- Health: `GET /messaging/integration/voice-stt/health` → `reachable: true`

## QA suite (opsiyonel)

```bash
QA_MESSAGING_VOICE_STT_OSS_GATE=1 bash scripts/run-lerta-premium-qa-suite.sh
```

Katman adı: `messaging_voice_stt_oss` — varsayılan suite bu gate’i **CONFIG_LATER** olarak işaretler.

## Müşteri hazır checklist

[VOICE-TRANSCRIBE-STT-OSS-7-CHECKLIST.md](./VOICE-TRANSCRIBE-STT-OSS-7-CHECKLIST.md)

## Deploy

`apply-messaging-voice-stt-local-vps-env.sh` → `MESSAGING_VOICE_STT_OSS_GATE_FAZ7=1`  
Post-deploy: `verify-messaging-post-deploy-gate.sh` içinde OSS gate çağrılır.
