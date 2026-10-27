# WebRTC Meet — Faz 5 (Güvenilirlik)

**Önkoşul:** Faz 1–4 feature bayrakları.

## Özellikler

- **Planlı görüşme push hatırlatması** — ~15 dk önce ve başlangıç penceresinde Expo + web push (Redis schedule index + arka plan job)
- **Sunucu kayıt arşivi** — thread meta listesi; isteğe bağlı küçük `.webm` (Redis, boyut limiti `MESSAGING_WEBRTC_MEET_RECORDING_MAX_BYTES`, varsayılan 2.5 MB)
- **TURN izleme** — `webrtc.turnMonitor` (`MESSAGING_WEBRTC_TURN_METRICS_URL` veya `MESSAGING_WEBRTC_TURN_ALLOCATIONS_HINT`)

Status feature: `messaging_webrtc_meet_reliability_faz5`

## API

- `GET /messaging/webrtc/threads/:threadId/recordings`
- `POST /messaging/webrtc/threads/:threadId/recordings`
- `GET /messaging/webrtc/threads/:threadId/recordings/:archiveId`

## Ortam

- `MESSAGING_WEBRTC_MEET_REMINDER_JOB_ENABLED` — `0` ile job kapalı
- `MESSAGING_WEBRTC_TURN_METRICS_URL` — JSON `{ "activeAllocations": number, "ok": true }`
- `MESSAGING_WEBRTC_TURN_ALLOCATIONS_HINT` — statik coturn tahmini
