# WebRTC Meet — Faz 6 (Prod ağ)

**Önkoşul:** Faz 1–5.

## Özellikler

- `turnMonitor` — TURN credential ICE içindeyse otomatik **enabled**; opsiyonel `MESSAGING_WEBRTC_TURN_ALLOCATIONS_HINT` / `MESSAGING_WEBRTC_TURN_METRICS_URL`
- Planlı görüşme **ZSET index backfill** (API boot / reminder job)
- Deploy script: TURN yazıldığında varsayılan alloc hint `0`
- Kapı: `scripts/verify-messaging-webrtc-meet-faz6-gate.sh`

Status feature: `messaging_webrtc_meet_prod_net_faz6`

## VPS

```bash
MESSAGING_TURN_URL=turn:turn.example.com:3478 \
MESSAGING_TURN_USERNAME=lerta \
MESSAGING_TURN_CREDENTIAL='SECRET' \
bash scripts/apply-messaging-webrtc-ice-vps-env.sh /var/www/nakliyeborsasi
```

## Sonraki (Faz 7)

Uyum arşivi UI, kayıt onayı, S3 kalıcı depo.
