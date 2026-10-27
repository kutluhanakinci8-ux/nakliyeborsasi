# STT-OSS-4 — Kapasite, kota ve güvenilirlik

## Env

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `MESSAGING_VOICE_STT_MAX_CONCURRENT` | `2` | API process içi eşzamanlı STT (0 = limitsiz) |
| `MESSAGING_VOICE_STT_RELIABILITY_FAZ1` | `1` (VPS script) | Feature `messaging_voice_stt_reliability_faz1` |
| `MESSAGING_VOICE_STT_MONTHLY_QUOTA` | `500` | Mevcut firma aylık kota (değişmedi) |

## Health

`GET /api/v1/messaging/integration/voice-stt/health`

```json
{
  "configured": true,
  "provider": "local",
  "reachable": true,
  "latencyMs": 840,
  "activeJobs": 0,
  "maxConcurrent": 2,
  "error": null
}
```

## Runbook (STT çökmesi)

1. VPS: `docker ps | grep lerta-messaging-local-stt`
2. `bash scripts/verify-messaging-voice-stt-local.sh`
3. Health endpoint — `reachable: false` → `docker restart lerta-messaging-local-stt`
4. API: `pm2 restart nakliyeborsasi-api --update-env`
5. Kullanıcı UI: `stt-error` → “sunucu yanıt vermedi”; `stt-busy` → tekrar dene

## Doğrulama

```bash
bash scripts/verify-messaging-voice-stt-oss4.sh
```

Paralel duman: `scripts/parallel-messaging-voice-stt-smoke.sh` (ops).
