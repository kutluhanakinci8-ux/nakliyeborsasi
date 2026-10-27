# WebRTC Meet — Faz 14 (eDiscovery / kayıt manifest)

**Önkoşul:** Faz 1–13.

## Özellikler

- `GET /messaging/webrtc/threads/:threadId/recordings/export` — arşiv meta listesi + blob varsa **SHA-256** (`contentSha256`)
- Pilot arşiv paneli: **eDiscovery JSON** indirme
- Platform communications ops snapshot: `webrtcMeet` (mesh ≤3, `sfuMode: disabled`, ICE caps, kayıt arşivi S3/limit)

Status feature: `messaging_webrtc_meet_ediscovery_faz14`

## Sonraki (Faz 15+)

SFU / &gt;3 kişi veya RN WebRTC native — `WEBRTC-MEET-ROADMAP.md`.
