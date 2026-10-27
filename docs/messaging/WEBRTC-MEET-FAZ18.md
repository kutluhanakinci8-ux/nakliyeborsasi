# WebRTC Meet — Faz 18 (SFU oturum / join bundle)

**Önkoşul:** Faz 1–17.

## Özellikler

- `GET/POST/DELETE /messaging/webrtc/threads/:threadId/sfu/session`
- Redis oturumu: `sessionId`, `joinToken`, `signalingUrl`, `joinQuery` (harici SFU istemcisi)
- Mesh görüşme (≤3) ayrı kalır; SFU pilot ayrı kanal
- `sfuBackend.sessionJoin` (path template + enabled when signaling URL set)
- Pilot: **SFU pilot (görüntülü/sesli)** → URL aç + panoya kopyala

Status feature: `messaging_webrtc_meet_sfu_session_faz18`

Gerekli env: `MESSAGING_WEBRTC_SFU_SIGNALING_URL` — `WEBRTC-SFU-VPS.md`

## Sonraki

Faz 19 tarayıcı gömme — `WEBRTC-MEET-FAZ19.md`.
